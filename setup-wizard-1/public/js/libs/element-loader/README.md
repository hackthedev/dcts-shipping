# Element loader

A simple library for showing loading animations on elements.

---

## Loader with variable value

```js
let element = document.getElementById("example");

ElementLoader.start(element, {
                style: "linear",
                color: "hsl(from var(--main) h s calc(l * 8))",
                value: 0
            });

// do your stuff
for(let x in abc) ....

// change the progress if needed
ElementLoader.setValue(element, 50%) // 0-100%

// stop the loader
ElementLoader.stop(element);
```

---

## Infinite loader 

```js
ElementLoader.start(element, {
        speed: 10,
        style: "slide"
    })

// once done
ElementLoader.stop(element);
```

