# Icons Lib

This small library is a collection of icons in svg format. These icons are mostly from if not all of them https://lucide.dev/. Icons can be displayed using `Icon.display("server")`.

Example:

```js
async function buildNavHTML(){
    getNavElement().innerHTML =
        `
        <div class="entry">
            ${Icon.display("server")}
            <p>Servers</p>
        </div>
        
        <div class="entry">
            ${Icon.display("edit")}
            <p>Account</p>
        </div>
        `;
}
```

