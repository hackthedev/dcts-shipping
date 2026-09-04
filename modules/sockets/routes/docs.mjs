import {rateLimit} from "../../functions/ratelimit.mjs";
import {app} from "../../functions/init/web.mjs";

const docsLimiter = rateLimit({
    windowMs: 60_000,
    ipLimit: 20,
    sigLimit: 500,
    trustProxy: true
});

app.get("/docs/list", docsLimiter, async (req, res) => {
    if (!fs.existsSync("docs")) return res.status(404).json({ error: "No docs folder found" });

    let docs = fs
        .readdirSync("docs", { recursive: true })
        .filter(file => file.endsWith(".md"))
        .map(file => {
            let cleanedFile = file.replaceAll("\\", "/");
            const fullPath = cleanedFile.startsWith("docs/") ? cleanedFile : `docs/${cleanedFile}`;
            const stat = fs.statSync(fullPath);

            return {
                path: fullPath.startsWith("docs/") ? `/${fullPath}` : `/docs/${fullPath}`,
                createdAt: stat.birthtimeMs,
                modifiedAt: stat.mtimeMs
            };
        });

    return res.status(200).json({ error: null, docs });
});


export default (io) => (socket) => {
};
