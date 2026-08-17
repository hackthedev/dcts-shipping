function loadPlugins(){
    socket.emit("getPluginList", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
        Object.keys(response.plugins).forEach(function(plugin) {
            let pluginObj = response.plugins[plugin];

            for(let i = 0; i < pluginObj.filePaths.length; i++){
                let file = pluginObj.filePaths[i];

                if(file.includes(`${plugin}\\main.js`) || file.includes(`${plugin}/main.js`)){
                    loadScript(`${file}?v={{version}}`);
                }
            }
        });
    });
}

function loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    if (!url.startsWith('/') && !url.startsWith('http')) {
        url = '/' + url.replace(/\\/g, '/');
    }
    script.src = url;

    script.onload = function() {
        console.log(`Plugin loaded: ${url}`);
        if (callback) callback();
    };

    script.onerror = function() {
        console.error(`Failed to load Plugin: ${url}`);
    };

    document.head.appendChild(script);
}

async function injectCss(src, id = null) {
    const existing = id
        ? document.getElementById(id)
        : [...document.querySelectorAll('link[rel="stylesheet"]')]
            .find(link => link.href === new URL(src, document.baseURI).href);

    if (existing) return existing;

    return new Promise((resolve, reject) => {
        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = src;

        if (id) link.id = id;

        link.onload = () => resolve(link);
        link.onerror = () => reject(new Error(`Could not load CSS: ${src}`));

        document.head.appendChild(link);
    });
}