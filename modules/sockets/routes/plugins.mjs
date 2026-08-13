import { app } from "../../../index.mjs";
import path from "path";
import fs from "fs";

import JSONTools from "@hackthedev/json-tools";

import unzipper from "unzipper";
import {Readable} from "stream";
import {getThemes} from "../getThemes.mjs";
import {getCache, setCache} from "../../functions/ip-cache.mjs";
import {checkHttpAuth} from "../../functions/main.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";

export let pluginBasePath = path.join(process.cwd(), "plugins");

export function getPackageHost(){
    return "https://dist.dcts.community";
}

export function getPackageUrl(identifier, version = null){
    if(!identifier) throw new Error("Missing identifier");
    return `${getPackageHost()}/api/package/${identifier}${version ? `/${version}` : ""}`;
}

export async function downloadFile(url, targetPath) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} - ${response.statusText} » ${url}`);
    }

    if(!fs.existsSync(targetPath)) fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
}

export async function getPackageDetails(identifier, version = null){
    if(!identifier) throw new Error("Missing package identifier");

    let infoRes = await fetch(getPackageUrl(identifier, version), {
        signal: AbortSignal.timeout(2500)
    })

    if(infoRes.status !== 200){
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

export async function getPackageFiles(url){
    if(!url) throw new Error("Missing package url");

    let filesRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if(filesRes.status !== 200){
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

export async function getLocalPlugins(){
    // most epic one liner i have ever done i think
    let pluginDirs = fs.readdirSync(pluginBasePath, { withFileTypes: true }).filter(file => file.isDirectory()).map(file => file.name);
    if(pluginDirs.length === 0) return {}

    let plugins = {}
    for(let plugin of pluginDirs){
        let pluginConfigLocation = path.join(pluginBasePath, plugin, "config.json");

        if(fs.existsSync(pluginConfigLocation)){
            let pluginConfig = JSON.parse(fs.readFileSync(pluginConfigLocation, "utf8"));
            plugins[plugin] ??= {
                ...pluginConfig,
                name: plugin
            }
        }
    }

    return plugins
}

async function handlePluginEndpointAuth(req, res, next){
    let authInfo = await checkHttpAuth(req);

    // session is straight up not valid
    if(authInfo?.isValid === false) {
        res.status(403).json({ error: "You need to be authorized for this"});
        return next();
    }

    // no account found
    if(!authInfo?.member?.id) {
        res.status(403).json({ error: "You need to be authorized for this"});
        return next();
    }

    // doesnt have the perms
    if(!await hasPermission(authInfo?.member.id, "managePluins")) {
        res.status(403).json({ error: "You need to be authorized for this"});
        return next();
    }

    if(res.finished) next();
}

app.get("/plugins/list", async (req, res, next) => {
    await handlePluginEndpointAuth(req, res, next);
    let plugins = await getLocalPlugins();
    return res.status(200).json({ ok: true, plugins });
});

app.post("/plugin/:plugin/download", async (req, res, next) => {
    await handlePluginEndpointAuth(req, res, next);

    let pluginName = req.params.plugin;
    if(!pluginName) return res.status(403).json({ error: "missing plugin identifier" });

    // lookup plugin info
    let pluginDetails = await getPackageDetails(pluginName);
    if(!pluginDetails?.name) return res.status(404).json({ error: `plugin not found: ${pluginDetails?.error ?? ""}` })

    // then lookup files to download
    let fileUrl = `${getPackageHost(pluginName)}/${pluginName.meta.paths.files}/no-version`;
    let pluginFiles = await getPackageFiles(fileUrl);
    let fileListObj = pluginFiles?.files;

    if(fileListObj?.length === 0) return res.status(404).json({ error: `no plugin download files found` })

    // check if the local folder exists
    let pluginDirLocation = path.join(pluginBasePath, pluginName);
    let pluginConfigLocation = path.join(pluginBasePath, pluginName, "config.json");
    if(!fs.existsSync(pluginDirLocation)) fs.mkdirSync(pluginDirLocation);

    for(let file of fileListObj){
        let fileDownloadUrl = `${getPackageUrl(pluginDetails.name)}/${file}`
        let localFilePath =path.join(pluginDirLocation, file)

        await downloadFile(fileDownloadUrl, localFilePath)
    }

    if(!fs.existsSync(pluginConfigLocation)) return res.status(404).json({ error: `plugin config.json not found` })

    return res.status(200).json({ ok: true });
});

app.get("/themes/download{/:theme}", async (req, res) => {
    const {plugin} = req.params;
    if(!plugin) return res.status(404).json({ok: false, error: "Missing theme parameter"});

    return res.status(403).json({ok: false, error: "Being changed"});

    return res.status(200).json({
        ok: true,
        plugin,
        config: data.config
    });
});



export default (io) => (socket) => {};
