import {app, fs} from "../../../index.mjs";
import {getCache, setCache} from "../../functions/ip-cache.mjs";
import JSONTools from "@hackthedev/json-tools";


export async function getBadges(type, id, beta = false){

    return new Promise(async (resolve, reject) => {
        var badgeUrl = `https://raw.githubusercontent.com/hackthedev/dcts-shipping/${beta ? "beta" : "main"}/badges/${type}/${id}.json`;
        //var badgeUrl = `https://raw.githubusercontent.com/hackthedev/dcts-shipping/refs/heads/${beta ? "beta" : "main"}/badges/${type}/${id}.json`;

        let badgeCache = await getCache(badgeUrl, "badges");
        if(badgeCache){
            resolve(badgeCache);
        }

        const res = await fetch(badgeUrl)
        if(res.status === 404){
            resolve(null);
        }
        else if(res.status === 200){
            const jsonText = await res.text()
            let json = JSONTools.tryParse(jsonText);

            setCache(badgeUrl, "badges", json);

            resolve(json);
        }
        else{
            resolve(null);
        }
    });
}

app.get("/badges/:type/:id", async (req, res) => {
    const { type, id} = req.params;

    if(!type) return res.status(403).send("Missing type param");
    if(!id) return res.status(403).send("Missing id param");

    if (!fs.existsSync("docs")) return res.status(404).json({ error: "No docs folder found" });

    let badges = await getBadges(type, id, true) || {};
    return res.status(200).json({ error: null, badges });
});


export default (io) => (socket) => {
};
