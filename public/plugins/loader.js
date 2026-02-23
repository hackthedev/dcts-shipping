function loadPlugins(){
    socket.emit("getPluginList", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
        Object.keys(response.plugins).forEach(function(plugin) {
            let pluginObj = response.plugins[plugin];
    
            for(let i = 0; i < pluginObj.filePaths.length; i++){
                let file = pluginObj.filePaths[i];
    
                if(file.includes(`${plugin}\\main.js`) || file.includes(`${plugin}/main.js`)){
                    loadScript(file);
                }
            }
        });
    });
}

function loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
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