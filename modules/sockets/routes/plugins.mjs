import { app } from "../../../index.mjs";
import path from "path";
import fs from "fs";

import JSONTools from "@hackthedev/json-tools";

import unzipper from "unzipper";
import {Readable} from "stream";
import {getThemes} from "../getThemes.mjs";
import {getCache, setCache} from "../../functions/ip-cache.mjs";


export async function loadPluginCache(force = false){
    return await getCache("plugin_cache", "plugin_cache")
}

export async function savePluginCache(data){
    if(!data) throw new Error("No plugin data to cache");
    await setCache("plugin_cache", "plugin_cache", data);
}

export async function listPlugins() {
    let cachedPlugins = await loadPluginCache();
    let githubPlugins = cachedPlugins?.data;

    if (typeof githubPlugins === "string") {
        try {
            githubPlugins = JSON.parse(githubPlugins);
        } catch {
            githubPlugins = [];
        }
    }

    if (!Array.isArray(githubPlugins) || !githubPlugins?.length) {
        githubPlugins = await getThemes();
        await savePluginCache(githubPlugins);
    }


    return githubPlugins;
}

export async function downloadPlugin(pluginName){
    if(!pluginName) throw new Error("Missing plugin name");

    const zipUrl = "https://api.github.com/repos/DCTS-Project/plugins/zipball/main";
    const pluginDir = path.resolve("plugins", pluginName);
    const configPath = path.join(pluginDir, "config.json");

    if(configPath.includes("..")) return {
        error: "Malicious filename"
    }

    if(!fs.existsSync(pluginDir)){
        fs.mkdirSync(pluginDir, { recursive: true });

        const res = await fetch(zipUrl, {
            headers: { "User-Agent": "DCTS" }
        });
        if(!res.ok) throw new Error("zip download failed");

        const nodeStream = Readable.fromWeb(res.body);

        await new Promise((resolve, reject) => {
            nodeStream
                .pipe(unzipper.Parse())
                .on("entry", entry => {
                    const rel = entry.path.split("/").slice(1).join("/");

                    if(!rel.startsWith(`plugins/${pluginName}/`)){
                        entry.autodrain();
                        return;
                    }

                    const outPath = pluginDir

                    if(entry.type === "Directory"){
                        fs.mkdirSync(outPath, { recursive: true });
                        entry.autodrain();
                    } else {
                        fs.mkdirSync(path.dirname(outPath), { recursive: true });
                        entry.pipe(fs.createWriteStream(outPath));
                    }
                })
                .on("close", resolve)
                .on("error", reject);
        });
    }

    let config = null;
    if(configPath.includes("..")) return {
        error: "Malicious filename"
    }

    if(fs.existsSync(configPath)){
        config = JSONTools.tryParse(fs.readFileSync(configPath, "utf8"));
    }

    return {
        config,
        pluginName
    };
}



app.get("/plugins/list", async (req, res) => {
    let plugins = await listPlugins();
    return res.status(200).json({ ok: true, plugins });
});

app.get("/themes/download{/:theme}", async (req, res) => {
    const {plugin} = req.params;
    if(!plugin) return res.status(404).json({ok: false, error: "Missing theme parameter"});

    const data = await downloadPlugin(plugin);

    return res.status(200).json({
        ok: true,
        plugin,
        config: data.config
    });
});



export default (io) => (socket) => {};
