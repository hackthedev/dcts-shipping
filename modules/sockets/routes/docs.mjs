import {app, fs} from "../../../index.mjs";

app.get("/docs/list", async (req, res) => {
    if (!fs.existsSync("docs")) return res.status(404).json({ error: "No docs folder found" });

    let docs = fs
        .readdirSync("docs", { recursive: true })
        .filter(file => file.endsWith(".md"))
        .map(file => {
            const fullPath = file.startsWith("docs/") ? file : `docs/${file}`;
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
