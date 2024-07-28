
//Main code made by halvves @github: https://github.com/halvves/shaderpen
//Modified to utilize wallpaper engine value hooking etc. (fancy words) by Sunpy @osufx
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function Shader(vs, fs, width = window.innerWidth, height = window.innerHeight) {
	this.canvas = document.createElement("canvas");
	this.canvas.width = width;
	this.canvas.height = height;
	this.canvas.style = "position:fixed;top:0px;left:0px;";
	document.body.append(this.canvas);

	var gl = this.gl = this.canvas.getContext("webgl");
	this.gl.clearColor(0, 0, 0, 0);

	var uniforms = this.uniforms = {
		iResolution: {
			type: "vec3",
			value: [width, height, 0]
		},
		iTime: {
			type: "float",
			value: 0
		},
		iMouse: {
			type: "vec4",
			value: [0, 0, 0, 0]
		},
    iColorTop: {
      type: "vec3",
        value: [0.0, 0.0, 0.05]
    },
    iColorBottom: {
      type: "vec3",
        value: [0.0, 0.0, 0.07]
    },
    iColorLines: {
      type: "vec3",
        /* value: [0.3, 0.3, 0.3] */
        value: [0.353, 0.0, 0.0]
    },
    iAmplitude: {
      type: "float",
      value: 1
    },
    iWaveLength: {
      type: "float",
      value: 1
    },
    iSpeed: {
      type: "float",
      value: 1
    },
    iWaveAdditive: {
      type: "float",
      value: 1
    },
    iClear: {
      type: "int",
      value: 0
    }
	}

	this.vs = this.gl.createShader(this.gl.VERTEX_SHADER);
	this.gl.shaderSource(this.vs, vs);
	this.gl.compileShader(this.vs);

	this.fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
	this.gl.shaderSource(this.fs, fs);
	this.gl.compileShader(this.fs);

	var program = this.program = this.gl.createProgram();
	this.gl.attachShader(this.program, this.vs);
	this.gl.attachShader(this.program, this.fs);
	this.gl.linkProgram(this.program);

	this.vert = new Float32Array([-1, 1, 1, 1, 1, -1, -1, 1, 1, -1, -1, -1]);
	this.buffer = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vert, this.gl.STATIC_DRAW);

	this.gl.useProgram(this.program);

	this.program.position = this.gl.getAttribLocation(this.program, "position");
	this.gl.enableVertexAttribArray(this.program.position);
	this.gl.vertexAttribPointer(this.program.position, 2, this.gl.FLOAT, false, 0, 0);

  Object.keys(this.uniforms).forEach(function (key, i) {
    uniforms[key].location = gl.getUniformLocation(program, key);
  });

	this.reportErrors();

	this.bind("render", "resize");

  window.addEventListener('resize', this.resize);

	this.render();

	return this;
}

_createClass(Shader, [{
    key: 'bind',
    value: function _bind() {
      var _this = this;

      for (var _len = arguments.length, methods = Array(_len), _key = 0; _key < _len; _key++) {
        methods[_key] = arguments[_key];
      }

      methods.forEach(function (method) {
        return _this[method] = _this[method].bind(_this);
      });
    }
  }, {
    key: 'render',
    value: function render(timestamp) {
      var _this2 = this;

      var gl = this.gl;

      var delta = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0;
      this.lastTime = timestamp;

      this.uniforms.iTime.value += delta;

      gl.clear(gl.COLOR_BUFFER_BIT);

      Object.keys(this.uniforms).forEach(function (key) {
        var t = _this2.uniforms[key].type;
        var method = t.match(/vec/) ? t[t.length - 1] + 'fv' : '1' + t[0];
        gl['uniform' + method](_this2.uniforms[key].location, _this2.uniforms[key].value);
      });

      gl.drawArrays(gl.TRIANGLES, 0, this.vert.length / 2);

      requestAnimationFrame(this.render);
    }
  }, {
    key: 'reportErrors',
    value: function reportErrors() {
      var gl = this.gl;

      if (!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(this.vs));
      }

      if (!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(this.fs));
      }

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.log(gl.getProgramInfoLog(this.program));
      }
    }
  }, {
    key: 'resize',
    value: function resize() {
      this.canvas.width = this.uniforms.iResolution.value[0] = window.innerWidth;
      this.canvas.height = this.uniforms.iResolution.value[1] = window.innerHeight;

      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }]);
  
const vs = `
attribute vec2 position;
void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

//Fragment shader is made by ejonghyuck @shadertoy: https://www.shadertoy.com/view/Xtt3R4
//Modified by Sunpy @osufx
const fs = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3 iResolution;
uniform float iTime;

uniform vec3 iColorTop;
uniform vec3 iColorBottom;
uniform vec3 iColorLines;
uniform float iAmplitude;
uniform float iWaveLength;
uniform float iSpeed;
uniform float iWaveAdditive;
uniform int iClear;

const float widthFactor = 1.5;

vec4 calcSine(vec2 uv, float speed, 
              float frequency, float amplitude, float shift, float offset,
              vec4 color, float width, float exponent, bool dir)
{
    float angle = iTime * speed * iSpeed * frequency * -1.0 + (shift + uv.x) * 2.0;
    
    float y = sin(angle * iWaveLength) * amplitude * iAmplitude + offset;
    float clampY = clamp(0.0, y, y);
    float diffY = y - uv.y;
    
    float dsqr = distance(y, uv.y);
    float scale = 1.0;
    
    if(dir && diffY > 0.0)
    {
        dsqr = dsqr * 4.0;
    }
    else if(!dir && diffY < 0.0)
    {
        dsqr = dsqr * 4.0;
    }
    
    scale = pow(smoothstep(width * widthFactor, 0.0, dsqr), exponent);
    
    return min(color * scale, color);
}


void main() {
    vec2 uv = gl_FragCoord.xy/iResolution.xy;

    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

    if (iClear == 0)
      color += vec4(vec3(mix(iColorBottom, iColorTop, uv.y)), 1.0);

    vec4 waveColor = vec4(iColorLines, 1.0 - iWaveAdditive);

    color += calcSine(uv, 0.2, 0.20, 0.2, 0.0, 0.5, waveColor, 0.1, 15.0,false);
    color += calcSine(uv, 0.4, 0.40, 0.15, 0.0, 0.5, waveColor, 0.1, 17.0,false);
    color += calcSine(uv, 0.3, 0.60, 0.15, 0.0, 0.5, waveColor, 0.05, 23.0,false);

    color += calcSine(uv, 0.1, 0.26, 0.07, 0.0, 0.3, waveColor, 0.1, 17.0,true);
    color += calcSine(uv, 0.3, 0.36, 0.07, 0.0, 0.3, waveColor, 0.1, 17.0,true);
    color += calcSine(uv, 0.5, 0.46, 0.07, 0.0, 0.3, waveColor, 0.05, 23.0,true);
    color += calcSine(uv, 0.2, 0.58, 0.05, 0.0, 0.3, waveColor, 0.2, 15.0,true);

    gl_FragColor = color;
}
`;

var shader;
window.onload = function() {
	shader = new Shader(vs, fs);
}

function setProperty(p) {
  var propList = Object.getOwnPropertyNames(p);
  for (var i = 0; i < propList.length; i++){
    var key = propList[i];
    var prop = p[propList[i]];
    if (key in shader.uniforms)
      handleShaderProperty(key, prop);
    else
      handleProperty(key, prop);
  }
}

function handleProperty(key, p) { //Because I am lazy I am not 100% implementing a handle for other stuff that I wont need.
  document.body.style = 'background-image:url("file:///'+p.value+'");background-size:cover;background-position:center center;background-repeat:no-repeat;';
}

function handleShaderProperty(key, p) {
  var obj = Object.getOwnPropertyNames(p);
  var value;

  switch(p.type) {
    default:
      value = p.value;
      break;
    case "color":
      value = p.value.split(" ");
      break;
  }

  if ("special" in p) {
    if ("multiply" in p.special) {
      switch(typeof value) {
        case "number":
          value *= p.special.multiply;
          break;
        case "object":
          for (var i = 0; i < value.length; i++)
            value[i] *= p.special.multiply;
          break;
      }
    }
    if ("reverse" in p.special && 
        "min"     in p &&
        "max"     in p) {
      value = p.max - value;
    }
  }

  shader.uniforms[key].value = value;
}

window.wallpaperPropertyListener = {
  applyUserProperties: function(properties) {
    setProperty(properties);
  }
};