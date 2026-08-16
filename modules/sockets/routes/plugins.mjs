import {app, io, socketHandlers} from "../../../index.mjs";
import path from "path";
import fs from "fs";

import {checkHttpAuth} from "../../functions/main.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";

import FrontendLibs from "@hackthedev/frontend-libs";
import Logger from "../../functions/logger.mjs";
import fse from "fs-extra";
import {pathToFileURL} from "url";
import {consolas} from "../../functions/io.mjs";
import colors from "colors";

export let pluginBasePath = path.join(process.cwd(), "plugins");

export function getPackageHost() {
    return "https://dist.dcts.community";
}

export function getPackageUrl(identifier, version = null) {
    if (!identifier) throw new Error("Missing identifier");
    return `${getPackageHost()}/api/package/${identifier}${version ? `/${version}` : ""}`;
}

export async function downloadFile(url, targetPath) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} - ${response.statusText} » ${url}`);
    }

    if (!fs.existsSync(targetPath)) fs.mkdirSync(path.dirname(targetPath), {recursive: true});

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
}

export async function getPackageDetails(identifier, version = null) {
    if (!identifier) throw new Error("Missing package identifier");

    let infoRes = await fetch(getPackageUrl(identifier, version), {
        signal: AbortSignal.timeout(2500)
    })

    if (infoRes.status !== 200) {
        return {
            error: "Unable to fetch package details for " + identifier,
            response: infoRes
        }
    }

    let rawJsonData = await infoRes.json();
    return {
        package: rawJsonData?.package,
        error: null,
        response: infoRes
    }
}

export async function getPackageFiles(url) {
    if (!url) throw new Error("Missing package url");

    let filesRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if (filesRes.status !== 200) {
        return {
            error: "Unable to fetch package files for " + url,
            response: filesRes,
            files: null
        }
    }

    let rawJsonData = await filesRes.json();
    return {
        files: rawJsonData?.files,
        error: null,
        response: filesRes
    }
}

export async function getLocalPlugins() {
    // most epic one liner i have ever done i think
    let pluginDirs = fs.readdirSync(pluginBasePath, {withFileTypes: true}).filter(file => file.isDirectory()).map(file => file.name);
    if (pluginDirs.length === 0) return {}

    let plugins = {}
    for (let plugin of pluginDirs) {
        let pluginConfigLocation = path.join(pluginBasePath, plugin, "config.json");
        let pluginReadmeLocation = path.join(pluginBasePath, plugin, "README.md");
        let pluginReadme = null;

        if(fs.existsSync(pluginReadmeLocation)) pluginReadme = fs.readFileSync(pluginReadmeLocation, "utf8");

        if (fs.existsSync(pluginConfigLocation)) {
            let pluginConfig = JSON.parse(fs.readFileSync(pluginConfigLocation, "utf8"));
            plugins[plugin] ??= {
                ...pluginConfig,
                name: plugin,
                meta: {
                    readme: pluginReadme
                }
            }
        }
    }

    return plugins
}

async function handlePluginEndpointAuth(req, res, next) {
    let authInfo = await checkHttpAuth(req);

    if (authInfo?.isValid === false) {
        return res.status(403).json({error: "You need to be authorized for this"});
    }

    if (!authInfo?.member?.id) {
        return res.status(403).json({error: "You need to be authorized for this"});
    }

    if (!await hasPermission(authInfo?.member.id, "managePluins")) {
        return res.status(403).json({error: "You need to be authorized for this"});
    }
}

export async function initPluginSystem() {

    // Directories where plugin files are located
    const pluginsDir = path.join(path.resolve(), "plugins");
    const publicPluginsDir = path.join(path.resolve(), "public", "plugins");

    // function to dynamically load and register socket event handlers
    const loadPluginSocketEvents = async (pluginSocketsDir, socketHandlers) => {
        const files = fs.readdirSync(pluginSocketsDir, {
            recursive: true
        });

        for (const file of files) {
            if (!file.endsWith(".mjs")) continue;

            const filePath = path.join(pluginSocketsDir, file);

            try {
                const fileUrl = pathToFileURL(filePath).href;
                const {default: handler} = await import(fileUrl);

                if (typeof handler !== "function") {
                    throw new Error(`Default export is not a function: ${filePath}`);
                }

                socketHandlers.push((socket) => {
                    return handler(io, socket);
                });

                Logger.debug(`Preloaded plugin socket handler: ${filePath}`);
            } catch (error) {
                Logger.error(filePath);
                Logger.error(error);
            }
        }
    };
    // Function to dynamically load and execute plugin functions
    const loadAndExecutePluginFunctions = async (pluginFunctionsDir) => {
        const files = fs.readdirSync(pluginFunctionsDir);
        for (const file of files) {
            if (file.endsWith(".mjs")) {
                const filePath = path.join(pluginFunctionsDir, file);
                const fileUrl = pathToFileURL(filePath).href;
                const module = await import(fileUrl);

                // Iterate over all exports in the module
                for (const [name, func] of Object.entries(module)) {
                    // Check if the export is a function and its name includes 'onLoad'
                    if (typeof func === "function" && name.includes("onLoad")) {
                        func();
                    }
                }
            }
        }
    };

    // Function to move web folders to the public directory
    const moveWebFolders = async (pluginWebDir, pluginName) => {
        const destinationDir = path.join(publicPluginsDir, pluginName);
        await fse.ensureDir(destinationDir); // Ensure the destination directory exists
        await fse.copy(pluginWebDir, destinationDir, {overwrite: true});
    };

    // Iterate over each plugin and process it
    const processPlugins = async () => {
        const pluginDirs = fs.readdirSync(pluginsDir);

        for (const pluginName of pluginDirs) {
            // ignore files
            if (fs.lstatSync(path.join(pluginsDir, pluginName)).isFile() === true)
                continue;

            const pluginDir = path.join(pluginsDir, pluginName);
            const pluginFunctionsDir = path.join(pluginDir, "functions");
            const pluginSocketsDir = path.join(pluginDir, "sockets");
            const pluginWebDir = path.join(pluginDir, "web");

            let pluginConfigPath = path.join(pluginDir, "config.json");
            let pluginConfig = null;

            if (fs.existsSync(pluginConfigPath)) {
                pluginConfig = JSON.parse(fs.readFileSync(pluginConfigPath, "utf8"));
            }
            else{
                Logger.error(`Plugin ${pluginName} is missing its config.json! Skipping!`)
                continue;
            }

            // some plugin meta
            let pluginTitle = pluginConfig?.title || false;
            let pluginEnabled = pluginConfig?.enabled || false;
            let pluginAuthor = pluginConfig?.author || "";
            let pluginVersion = pluginConfig?.version || 0;

            // skip disabled plugin
            if (pluginEnabled !== true) {
                Logger.warn(
                    `Skipped loading plugin ${pluginTitle} (${pluginName}) because its not enabled`,
                );
                Logger.warn("This was temporarily bypassed due to testing!")
                //continue;
            }

            let depResult = await installPluginDependencies(pluginName)
            if(depResult?.failed?.length > 0){
                Logger.error(`Skipping Plugin ${pluginName} because the following dependencies couldnt be installed:`);
                Logger.error(depResult.failed.join(", "));
                continue;
            }

            // Load and execute plugin functions
            if (fs.existsSync(pluginFunctionsDir)) {
                await loadAndExecutePluginFunctions(pluginFunctionsDir);
            }

            // Register socket events
            if (fs.existsSync(pluginSocketsDir)) {
                await loadPluginSocketEvents(pluginSocketsDir, socketHandlers);
            }

            // Move web folders to the public directory
            if (fs.existsSync(pluginWebDir)) {
                await moveWebFolders(pluginWebDir, pluginName);
            }

            consolas(colors.yellow(`Loaded plugin ${colors.white(pluginName)}`));
        }
    };

    // Process plugins at server start
    processPlugins().catch((err) => console.error(err));
    await initPluginRoutes();
}

async function initPluginRoutes(){
    app.get("/plugins/list", async (req, res, next) => {
        return await handlePluginList(req, res, next);
    });

    app.post("/plugin/:plugin/:action", async (req, res, next) => {
        return await handlePluginAction(req, res, next);
    });
}

export async function handlePluginList(req, res, next){
    await handlePluginEndpointAuth(req, res, next);
    if (res.headersSent) return;

    let plugins = await getLocalPlugins();
    return res.status(200).json({ error: null, plugins});
}

export async function handlePluginAction(req, res, next){
    await handlePluginEndpointAuth(req, res, next);
    if (res.headersSent) return;

    const action = req?.params?.action ?? null;

    if(action === "install"){
        return await installPlugin(req, res, next);
    }

    if(action === "uninstall"){
        return await uninstallPlugin(req, res, next);
    }

    return res.status(200).json({error: null});
}

async function uninstallPlugin(req, res, next){
    let pluginName = req.params.plugin;
    if (!pluginName) return res.status(403).json({error: "missing plugin identifier"});

    if(pluginName.indexOf("..") !== -1) res.status(403).json({error: "Malicious request"});

    // check if the plugin dir exists and if so delete it
    let pluginDirLocation = path.join(pluginBasePath, pluginName);
    if(fs.existsSync(pluginDirLocation)){
        fs.rmSync(pluginDirLocation, {
            recursive: true,
            force: true
        });
    }

    res.status(200).json({error: null});
}

async function installPlugin(req, res){
    let pluginName = req.params.plugin;
    if (!pluginName) return res.status(403).json({error: "missing plugin identifier"});

    // fuck you
    if(pluginName.indexOf("..") !== -1) res.status(403).json({error: "Malicious request"});

    // lookup plugin info
    let pluginDetails = await getPackageDetails(pluginName);
    if (!pluginDetails?.package?.name) return res.status(404).json({error: `plugin not found: ${pluginDetails?.error ?? ""}`})

    // then lookup files to download
    let fileUrl = `${getPackageHost(pluginName)}/${pluginDetails.package.meta.paths.files}/no-version`;
    let pluginFiles = await getPackageFiles(fileUrl);
    let fileListObj = pluginFiles?.files;

    if (fileListObj?.length === 0) return res.status(404).json({error: `no plugin download files found`})

    // check if the local folder exists
    let pluginDirLocation = path.join(pluginBasePath, pluginName);
    let pluginConfigLocation = path.join(pluginBasePath, pluginName, "config.json");
    if (!fs.existsSync(pluginDirLocation)) fs.mkdirSync(pluginDirLocation);

    // download the files
    for (let file of fileListObj) {
        let fileDownloadUrl = `${getPackageUrl(pluginDetails.package.name)}/${file}`
        let localFilePath = path.join(pluginDirLocation, file)

        await downloadFile(fileDownloadUrl, localFilePath)
    }

    // check if the config exists so we can install dependencies etc
    if (!fs.existsSync(pluginConfigLocation)) return res.status(404).json({error: `plugin config.json not found`});
    await installPluginDependencies(pluginName);

    return res.status(200).json({ error: null})
}

export async function installPluginDependencies(pluginName) {
    if (!pluginName) throw new Error("Missing plugin name");

    let pluginDirLocation = path.join(pluginBasePath, pluginName);
    let pluginConfigLocation = path.join(pluginDirLocation, "config.json");

    if (!fs.existsSync(pluginConfigLocation)) {
        return Logger.error(`Plugin config.json not found for plugin '${pluginName}'`)
    }

    // parse plugin config.
    let pluginConfig = JSON.parse(fs.readFileSync(pluginConfigLocation, "utf8"));

    let failedDependencies = []
    // check and install all dependencies
    if (pluginConfig?.dependencies?.length > 0) {
        for (let dependency of pluginConfig.dependencies) {
            let installResult = await FrontendLibs.install(dependency, path.join(path.resolve(), "node_modules"));

            if(installResult?.success === false) {
                failedDependencies.push(dependency);
                Logger.error(installResult?.message);
            }
            else{
                Logger.success(installResult?.message);
            }
        }
    }

    return {
        failed: failedDependencies,
    };
}

export default (io) => (socket) => {
};
