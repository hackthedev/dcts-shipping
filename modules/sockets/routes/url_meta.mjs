import fetch from "node-fetch";
import { app, fs } from "../../../index.mjs";
import {getCache, setCache} from "../../functions/ip-cache.mjs";
import JSONTools from "@hackthedev/json-tools";

async function url_meta(url) {
    if (!url.startsWith("http")) url = "https://" + url;

    const res = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; bot/1.0)" },
        signal: AbortSignal.timeout(10000),
    });

    const html = await res.text();

    const meta = (name) => {
        const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
            || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
        return m ? m[1] : null;
    };

    const title_tag = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    return {
        url,
        title: meta("og:title") || (title_tag ? title_tag[1].trim() : null),
        description: meta("og:description") || meta("description"),
        image: meta("og:image") || meta("twitter:image"),
        site_name: meta("og:site_name"),
        favicon: new URL("/favicon.ico", url).href,
    };
}

app.get("/meta/:url", async (req, res) => {
    const url = req.params.url;
    if (!url || !/^https?:\/\//.test(url)) return res.status(400).send("Invalid URL");

    let metaCache = await getCache(url, "meta_url_cache");
    if(metaCache){
        return res.status(200).json({error: null, meta: JSONTools.tryParse(metaCache.data)});
    }

    try{
        let meta = await url_meta(url);
        if(meta?.title) await setCache(url, "meta_url_cache", meta);

        res.status(200).json({error: null, meta});
    } catch {
        res.status(500).json({error: "Meta Fetch error", meta: null});
    }
});

export default (io) => (socket) => {};
