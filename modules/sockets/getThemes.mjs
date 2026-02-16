import { validateMemberId } from "../functions/main.mjs";
import { fs } from "../../index.mjs";
import https from "https";
import ArrayTools from "@hackthedev/arraytools";

function getLocalThemes() {
    const dirs = fs.readdirSync("./public/css/themes/", { withFileTypes: true });
    return dirs.filter(d => d.isDirectory()).map(d => d.name);
}

function fetchGithubThemes() {
    return new Promise(resolve => {
        https.get(
            "https://api.github.com/repos/DCTS-Project/themes/contents/theme\n",
            { headers: { "User-Agent": "DCTS" } },
            res => {
                let raw = "";
                res.on("data", c => raw += c);
                res.on("end", () => {
                    try {
                        const json = JSON.parse(raw);
                        resolve(json.filter(x => x.type === "dir").map(x => x.name));
                    } catch {
                        resolve([]);
                    }
                });
            }
        ).on("error", () => resolve([]));
    });
}

function getThemeFiles(theme) {
    const base = `./public/css/themes/${theme}/`;
    if (!fs.existsSync(base)) return [];
    return fs.readdirSync(base).filter(f => f.endsWith(".css"));
}

export async function getThemes(){
    const local = getLocalThemes();
    const remote = await fetchGithubThemes();
    const merged = ArrayTools.merge(...new Set([...local, ...remote]));
    return merged
}

export default (io) => (socket) => {
    socket.on("getThemes", async (member, response) => {
        if (validateMemberId(member?.id, socket, member?.token) !== true) return;
        const local = getLocalThemes();
        const remote = await fetchGithubThemes();
        const merged = Array.from(new Set([...local, ...remote]));
        response({ error: null, themes: merged });
    });

    socket.on("getThemeFiles", (theme, response) => {
        const files = getThemeFiles(theme);
        response({ error: null, files });
    });
};
