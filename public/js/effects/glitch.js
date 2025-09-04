function hackerGlitch(
    targetElement = document.body,
    {
        text = "Connection lost..",
        intensity = 1.0,             // 0..2+ (density/amplitude/speed)
        bgAlpha = 0.14,              // 0..1 (overlay background opacity)
        antsOpacity = 0.55,
        scanlineOpacity = 0.55,
        blocking = true,
        useSnapshot = true,          // true|"auto"|false  (true uses html2canvas if present, else local snapshot)
        snapshotScale = 1.25,        // scale for snapshots
        maskLiveOnSnapshot = true,   // if snapshot succeeds, hide live backdrop effects
        zIndex = 2147483647
    } = {}
) {
    if (!targetElement) return () => {};

    // normalize flag
    const snapMode = (typeof useSnapshot === "string")
        ? (useSnapshot.toLowerCase() === "true" ? true :
            useSnapshot.toLowerCase() === "false" ? false :
                useSnapshot.toLowerCase() === "auto" ? "auto" : true)
        : !!useSnapshot;

    const fullscreen = (targetElement === document.body || targetElement === document.documentElement);

    // ---------- Styles (once) ----------
    if (!document.getElementById("hg5-styles")) {
        const css = document.createElement("style");
        css.id = "hg5-styles";
        css.textContent = `
      .hg5-overlay{
        --scan-speed:6s; --ants-speed:1.15s; --rgb-speed:2.6s; --slice-dur:.26s;
        position:absolute; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden;
        background: transparent; /* will be set inline with !important */
        will-change: filter, opacity; /* no global wiggle */
      }
      .hg5-overlay.block{pointer-events:auto} .hg5-overlay.pass{pointer-events:none}

      .hg5-snapbase{
        position:absolute; inset:0; pointer-events:none;
        background-repeat:no-repeat; background-position:0 0;
        background-size:var(--bgw,100%) var(--bgh,100%);
        opacity:1;
      }

      .hg5-backdrop{
        position:absolute; inset:0; pointer-events:none;
        background: rgba(0,0,0,0.001); /* forces rendering so backdrop-filter applies */
        backdrop-filter: brightness(1.06) contrast(1.12) saturate(1.28) hue-rotate(var(--global-hue,0deg));
      }

      .hg5-scan{ position:absolute; inset:-40% 0 0 0;
        background:repeating-linear-gradient(to bottom, rgba(0,0,0,1) 0px, rgba(0,0,0,1) 1px, rgba(0,0,0,0.08) 3px);
        mix-blend-mode:multiply; animation:hg5-scan var(--scan-speed) linear infinite; pointer-events:none }
      @keyframes hg5-scan{0%{transform:translateY(0)}100%{transform:translateY(40%)}}

      .hg5-ants{ position:absolute; inset:0;
        background:repeating-linear-gradient(135deg, rgba(0,0,0,.35) 0px, rgba(0,0,0,.35) 2px, rgba(0,0,0,.06) 3px, rgba(0,0,0,.06) 6px);
        mix-blend-mode:multiply; animation:hg5-ants var(--ants-speed) linear infinite; pointer-events:none }
      @keyframes hg5-ants{0%{background-position:0 0}100%{background-position:12px 12px}}

      .hg5-rgb{ position:absolute; inset:0;
        background:linear-gradient(90deg, rgba(0,255,200,0.07), rgba(255,0,255,0.07));
        mix-blend-mode:screen; opacity:0; animation:hg5-rgb var(--rgb-speed) ease-in-out infinite; pointer-events:none }
      @keyframes hg5-rgb{0%,100%{opacity:0; transform:translateX(0)}40%{opacity:.14; transform:translateX(.9%)}70%{opacity:.10; transform:translateX(-.9%)}}

      .hg5-wrap{ position:relative; z-index:3; display:flex; flex-direction:column; align-items:center; gap:10px; }

      .hg5-text{
        position:relative; text-align:center; text-transform:uppercase;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-weight:900; letter-spacing:.08em; color:#e9ecef; font-size:clamp(24px,5.5vw,56px);
        text-shadow:0 0 10px rgba(0,255,200,.08), 0 0 10px rgba(255,0,255,.08);
        will-change: transform, filter;
      }
      .hg5-text::before,.hg5-text::after{ content:attr(data-text); position:absolute; inset:0; pointer-events:none }
      .hg5-text::before{ color:#00ffee; mix-blend-mode:lighten; clip-path:polygon(0 0,100% 0,100% 46%,0 42%); animation:hg5-gt-l 1.2s steps(2,end) infinite }
      .hg5-text::after{  color:#ff00ff; mix-blend-mode:lighten; clip-path:polygon(0 58%,100% 52%,100% 100%,0 100%); animation:hg5-gt-r 1.05s steps(2,end) infinite }
      @keyframes hg5-gt-l{0%{transform:translate(-1px,0)}50%{transform:translate(-4px,0)}100%{transform:translate(-1px,0)}}
      @keyframes hg5-gt-r{0%{transform:translate(1px,0)}50%{transform:translate(3px,0)}100%{transform:translate(1px,0)}}

      .hg5-text-slices{ position:absolute; inset:0; pointer-events:none }
      .hg5-tx{ position:absolute; left:-4%; width:108%; color:#e9ecef; white-space:nowrap; mix-blend-mode:lighten; opacity:.9; will-change:transform,filter,opacity }

      .hg5-tears{ position:absolute; inset:0; pointer-events:none }
      .hg5-slice{
        position:absolute; left:0; width:100%;
        background-repeat:no-repeat; background-position: var(--bgx,0px) var(--bgy,0px);
        background-size: var(--bgw,100%) var(--bgh,100%);
        background-image: var(--snap, none), linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,255,200,0.10) 15%, rgba(255,0,255,0.10) 85%, rgba(0,0,0,0) 100%);
        mix-blend-mode:screen;
        opacity:.25; transform:translateX(0) skewX(0deg);
        animation: hg5-slice-move var(--slice-dur) ease-out forwards; will-change: transform, filter, opacity;
      }
      @keyframes hg5-slice-move{
        0%{   transform: translateX(var(--dx-start,-1%)) skewX(var(--skew,0deg)); opacity:.35; }
        40%{  transform: translateX(var(--dx-mid, 2%))  skewX(var(--skew,0deg)); opacity:.28; }
        100%{ transform: translateX(0)                  skewX(0);               opacity:0;   }
      }
    `;
        document.head.appendChild(css);
    }

    // ---------- Overlay ----------
    const overlay = document.createElement("div");
    overlay.className = `hg5-overlay ${blocking ? "block" : "pass"}`;

    // lock background alpha with !important (this cannot be overridden by later inline writes)
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const setOverlayBgImportant = () =>
        overlay.style.setProperty('background-color', `rgba(6,8,10,${clamp01(bgAlpha)})`, 'important');
    setOverlayBgImportant();

    if (fullscreen) { overlay.style.position = "fixed"; overlay.style.inset = "0"; overlay.style.zIndex = String(zIndex); }
    else {
        const cs = getComputedStyle(targetElement);
        if (cs.position === "static") { targetElement.dataset.hgWasStatic = "1"; targetElement.style.position = "relative"; }
    }

    const snapBase = document.createElement("div");
    snapBase.className = "hg5-snapbase";
    snapBase.style.display = "none";

    const backdropFx = document.createElement("div");
    backdropFx.className = "hg5-backdrop";

    const scan = document.createElement("div"); scan.className = "hg5-scan"; scan.style.opacity = String(scanlineOpacity);
    const ants = document.createElement("div"); ants.className = "hg5-ants"; ants.style.opacity = String(antsOpacity);
    const rgb  = document.createElement("div"); rgb.className = "hg5-rgb";

    const wrap = document.createElement("div"); wrap.className = "hg5-wrap";
    const title = document.createElement("div"); title.className = "hg5-text"; title.setAttribute("data-text", text); title.textContent = text;
    const textSlices = document.createElement("div"); textSlices.className = "hg5-text-slices";
    wrap.appendChild(textSlices); wrap.appendChild(title);

    const tears = document.createElement("div"); tears.className = "hg5-tears";

    overlay.appendChild(snapBase);
    overlay.appendChild(backdropFx);
    overlay.appendChild(scan);
    overlay.appendChild(ants);
    overlay.appendChild(rgb);
    overlay.appendChild(wrap);
    overlay.appendChild(tears);
    targetElement.appendChild(overlay);

    // ---------- Glitch Engine ----------
    const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
    const map = (v,i0,i1,o0,o1)=>o0+(o1-o0)*((v-i0)/(i1-i0));
    const I = clamp(intensity,0,2);

    const speedFactor = 0.7 + I*1.7;
    overlay.style.setProperty("--scan-speed", `${(6/speedFactor).toFixed(2)}s`);
    overlay.style.setProperty("--ants-speed", `${(1.15/speedFactor).toFixed(2)}s`);
    overlay.style.setProperty("--rgb-speed",  `${(2.6/speedFactor).toFixed(2)}s`);
    overlay.style.setProperty("--slice-dur",  `${(0.26/speedFactor).toFixed(3)}s`);

    const burstEvery = clamp(900 - I*650, 100, 900);
    const baseSlices = 3 + Math.round(I*7);
    const baseTextSlices = 2 + Math.round(I*5);
    const dxMaxPct = map(I,0,2,1.2,7.5);
    const skewMax = map(I,0,2,5,18);
    const hMax = map(I,0,2,6,18);
    const hueMax = map(I,0,2,20,110);
    const jitterMs = clamp(220 - I*160, 40, 220);

    ants.style.opacity = String(clamp(antsOpacity + I*0.08, 0, 1));
    scan.style.opacity = String(clamp(scanlineOpacity + I*0.06, 0, 1));

    let snapURL=null, snapW=0, snapH=0;

    // ---------- Snapshot (no network) ----------
    (async function maybeSnapshot(){
        if (snapMode === false) return;
        const want = (snapMode === true || snapMode === "auto");
        if (!want) return;

        // prefer existing html2canvas if already loaded locally; otherwise try our local snapshotter
        const rect = fullscreen
            ? { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, absX: window.scrollX, absY: window.scrollY }
            : (() => { const r = overlay.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, absX: r.x + window.scrollX, absY: r.y + window.scrollY }; })();

        const prevVis = overlay.style.visibility;
        overlay.style.visibility = "hidden";

        try {
            if (window.html2canvas) {
                // use already-present html2canvas (no network)
                const canvas = await window.html2canvas(document.body, {
                    backgroundColor: null,
                    useCORS: true,
                    scale: snapshotScale,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight
                });

                const crop = document.createElement("canvas");
                crop.width  = Math.max(1, Math.round(rect.width  * snapshotScale));
                crop.height = Math.max(1, Math.round(rect.height * snapshotScale));
                const ctx = crop.getContext("2d");
                ctx.drawImage(
                    canvas,
                    Math.round(rect.absX * snapshotScale),
                    Math.round(rect.absY * snapshotScale),
                    Math.round(rect.width * snapshotScale),
                    Math.round(rect.height * snapshotScale),
                    0, 0,
                    crop.width, crop.height
                );
                snapURL = safeToDataURL(crop);
                if (!snapURL) throw new Error("toDataURL blocked/tainted");
                snapW = rect.width; snapH = rect.height;
            } else {
                // offline local snapshot (SVG foreignObject + inlined computed styles)
                const result = await localSnapshot(rect, snapshotScale);
                if (result) {
                    snapURL = result.url; snapW = rect.width; snapH = rect.height;
                }
            }

            if (snapURL) {
                snapBase.style.backgroundImage = `url("${snapURL}")`;
                snapBase.style.setProperty("--bgw", `${snapW}px`);
                snapBase.style.setProperty("--bgh", `${snapH}px`);
                snapBase.style.display = "block";

                overlay.style.setProperty("--snap", `url("${snapURL}")`);
                overlay.style.setProperty("--bgw", `${snapW}px`);
                overlay.style.setProperty("--bgh", `${snapH}px`);

                if (maskLiveOnSnapshot) backdropFx.style.display = "none";
            }
        } catch (e) {
            // snapshot failed → fallback continues
            // console.warn("snapshot failed:", e);
        } finally {
            overlay.style.visibility = prevVis || "visible";
            // re-assert alpha lock
            setOverlayBgImportant();
        }
    })();

    // ---------- Slice / Text Glitch ----------
    function makeSlice(){
        const s = document.createElement("div");
        s.className = "hg5-slice";

        const topPct = Math.random()*100;
        const heightPct = clamp((Math.random()*hMax)+1.4, 2.4, hMax);
        s.style.top = `${topPct}%`;
        s.style.height = `${heightPct}%`;

        const dxStart = (Math.random()*2-1)*dxMaxPct;
        const dxMid   = (Math.random()*2-1)*dxMaxPct;
        s.style.setProperty("--dx-start", `${dxStart}%`);
        s.style.setProperty("--dx-mid", `${dxMid}%`);
        const skew = (Math.random()*2-1)*skewMax;
        s.style.setProperty("--skew", `${skew}deg`);

        if (snapURL) {
            const sliceTopPx = (topPct/100) * snapH;
            s.style.setProperty("--snap", `url("${snapURL}")`);
            s.style.setProperty("--bgw", `${snapW}px`);
            s.style.setProperty("--bgh", `${snapH}px`);
            s.style.setProperty("--bgx", `0px`);
            s.style.setProperty("--bgy", `-${sliceTopPx}px`);
            s.style.opacity = (0.30 + Math.random()*0.18).toFixed(2);
        } else {
            s.style.opacity = (0.22 + Math.random()*0.18).toFixed(2);
        }

        tears.appendChild(s);
        s.addEventListener("animationend", ()=>s.remove(), {once:true});
        setTimeout(()=>s.remove(), 900);
    }

    function makeTextSlice(){
        const t = document.createElement("div");
        t.className = "hg5-tx";
        t.textContent = text;

        const h = title.getBoundingClientRect().height || 40;
        const hSlice = clamp((Math.random()*0.55+0.12)*h, 6, h*0.7);
        const top = Math.random()*h - hSlice*0.2;

        t.style.top = `${top}px`;
        t.style.height = `${hSlice}px`;
        t.style.clipPath = `inset(${Math.max(0, top)}px 0 ${Math.max(0, h-(top+hSlice))}px 0)`;

        const dx = (Math.random()*2-1)*(dxMaxPct*1.2);
        const sk = (Math.random()*2-1)*(skewMax*1.1);
        const hue = (Math.random()*2-1)*hueMax;
        const sat = 1.0 + Math.random()*0.6;

        t.style.transform = `translateX(${dx}%) skewX(${sk}deg)`;
        t.style.filter = `hue-rotate(${hue}deg) saturate(${sat})`;
        t.style.opacity = (0.75+Math.random()*0.25).toFixed(2);

        textSlices.appendChild(t);
        const life = clamp(220/speedFactor + Math.random()*80, 120, 320);
        setTimeout(()=>{
            t.style.transition = `transform ${Math.max(80/speedFactor,50)}ms ease-out, opacity ${Math.max(120/speedFactor,60)}ms ease-out, filter ${Math.max(100/speedFactor,60)}ms ease-out`;
            t.style.transform = `translateX(0) skewX(0)`; t.style.opacity = "0";
            t.addEventListener("transitionend", ()=>t.remove(), {once:true});
        }, life);
    }

    function burst(){
        const globalHue = ((Math.random()*2-1)*hueMax)|0;
        backdropFx.style.setProperty("--global-hue", `${globalHue}deg`);
        overlay.style.filter = `hue-rotate(${globalHue*0.35}deg)`;

        const count = baseSlices + Math.floor(Math.random()*(2+I*3));
        for (let i=0;i<count;i++) setTimeout(makeSlice, Math.random()*Math.max(30, (burstEvery*0.35)/speedFactor));

        const tCount = baseTextSlices + Math.floor(Math.random()*(1+I*2));
        for (let i=0;i<tCount;i++) setTimeout(makeTextSlice, Math.random()*Math.max(20, (burstEvery*0.25)/speedFactor));
    }

    function jitter(){
        const dx = (Math.random()-0.5)*I*3.2;
        const dy = (Math.random()-0.5)*I*2.2;
        const hue = (Math.random()*2-1)*hueMax*0.4;
        const italic = Math.random() < (0.35 + 0.25*I);
        const sk = (Math.random()*2-1)*(6 + I*10);
        title.style.fontStyle = italic ? "italic" : "normal";
        title.style.transform = `translate(${dx}px, ${dy}px) skewX(${italic ? sk : 0}deg)`;
        title.style.filter = `hue-rotate(${hue}deg) drop-shadow(0 0 6px rgba(0,255,200,${0.06+0.12*Math.random()}))`;
    }

    const ticker = setInterval(burst, Math.max(60, burstEvery/speedFactor));
    const jit = setInterval(jitter, Math.max(30, jitterMs/speedFactor));
    burst();
    setOverlayBgImportant();

    // ---------- Stop ----------
    return function stop(){
        clearInterval(ticker); clearInterval(jit);
        overlay.remove();
        if (targetElement.dataset.hgWasStatic === "1") { delete targetElement.dataset.hgWasStatic; targetElement.style.position = ""; }
    };

    // ----- helpers -----

    // toDataURL guard (handles tainted canvas)
    function safeToDataURL(canvas){
        try { return canvas.toDataURL("image/png"); } catch { return null; }
    }

    // Local snapshot using SVG foreignObject + computed styles (no network)
    async function localSnapshot(viewRect, scale=1){
        // clone and inline computed styles
        const srcRoot = document.documentElement; // includes <body> bg etc.
        const clone = srcRoot.cloneNode(true);
        inlineAllComputedStyles(srcRoot, clone);

        // offset so that viewRect is at (0,0)
        const xhtmlNS = "http://www.w3.org/1999/xhtml";
        const wrapper = document.createElementNS(xhtmlNS, "div");
        wrapper.setAttribute("xmlns", xhtmlNS);
        wrapper.style.width = document.documentElement.scrollWidth + "px";
        wrapper.style.height = document.documentElement.scrollHeight + "px";
        wrapper.style.overflow = "hidden";
        wrapper.style.transform = `translate(${-viewRect.absX}px, ${-viewRect.absY}px)`;
        wrapper.appendChild(clone);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("width", Math.round(viewRect.width*scale));
        svg.setAttribute("height", Math.round(viewRect.height*scale));
        svg.setAttribute("viewBox", `0 0 ${viewRect.width} ${viewRect.height}`);

        const fo = document.createElementNS(svgNS, "foreignObject");
        fo.setAttribute("x", "0");
        fo.setAttribute("y", "0");
        fo.setAttribute("width", String(viewRect.width));
        fo.setAttribute("height", String(viewRect.height));
        fo.appendChild(wrapper);
        svg.appendChild(fo);

        const xml = new XMLSerializer().serializeToString(svg);
        const data = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

        const img = new Image();
        img.decoding = "sync";
        // Important: no crossOrigin set → avoids extra fetch attempts offline
        const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        img.src = data;
        try { await loaded; } catch { return null; }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewRect.width*scale));
        canvas.height = Math.max(1, Math.round(viewRect.height*scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const url = safeToDataURL(canvas);
        if (!url) return null;
        return { url };
    }

    function inlineAllComputedStyles(src, dst){
        // copy computed styles
        try {
            const cs = getComputedStyle(src);
            for (let i=0;i<cs.length;i++){
                const prop = cs[i];
                dst.style.setProperty(prop, cs.getPropertyValue(prop));
            }
        } catch {}
        // remove animations/transitions to keep snapshot stable
        dst.style.animation = "none";
        dst.style.transition = "none";

        // recurse
        const srcKids = src.children || [];
        const dstKids = dst.children || [];
        const n = Math.min(srcKids.length, dstKids.length);
        for (let i=0;i<n;i++){
            inlineAllComputedStyles(srcKids[i], dstKids[i]);
        }
    }
}
