import { validateMemberId, copyObject } from "../functions/main.mjs";
import { serverconfig } from "../../index.mjs";
import { scanDirectory } from "../functions/io.mjs";

export default (io) => (socket) => {
    socket.on('getPluginList', (member, response) => {
        let plugins = scanDirectory("./public/plugins", { includeFiles: false, recursive: false });
        let pluginObj = {};

        // foreach plugin
        for (let i = 0; i < plugins.length; i++) {
            let pluginName = copyObject(plugins[i]).split("\\").pop();

            pluginObj[pluginName] = {};
            pluginObj[pluginName].filePaths = [];

            // check root of plugin
            let pluginRoot = scanDirectory(plugins[i], { includeFiles: true, recursive: false });

            // check for entry script
            if (pluginRoot.includes(`${plugins[i]}\\main.js`)) {
                pluginObj[pluginName].filePaths.push(`${plugins[i]}\\main.js`);
                pluginObj[pluginName].filePaths = pluginObj[pluginName].filePaths.map(plugin => plugin.replace("public\\", ""));
            }
        }

        response({ type: 'success', plugins: pluginObj });
    });
};
