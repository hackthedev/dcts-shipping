
export default function registerRoute(app, deps) {
    const {pool, asyncHandler, signToken, dbQuery, requireAuth, tagLength} = deps;

    app.put("/servers/:id", requireAuth, asyncHandler(async (req, res) => {
        const {id} = req.params;
        const {url} = req.body || {};

        if (!url) return res.status(400).json({ok: false, error: "Missing url"});

        let tags = [];

        if (Array.isArray(req.body.tags)) {
            tags = req.body.tags.map(t => String(t || "").trim().slice(0, tagLength)).filter(Boolean);
        } else if (req.body.tags) {
            tags = String(req.body.tags)
                .split(",")
                .map(t => t.trim().slice(0, tagLength))
                .filter(Boolean);
        }

        // check ownership
        const rows = await dbQuery("SELECT owner_id FROM servers WHERE id = ? LIMIT 1", [id]);
        const row = rows[0];
        if (!row) return res.status(404).json({ok: false, error: "Not Found"});
        if (row.owner_id !== req.user.id) return res.status(403).json({ok: false, error: "Forbidden"});

        // handle tags
        let tagsToStore;
        if (Array.isArray(tags)) {
            tagsToStore = JSON.stringify(tags);
        } else if (typeof tags === "string") {
            const arr = tags.split(",").map(s => s.trim()).filter(Boolean);
            tagsToStore = JSON.stringify(arr);
        } else {
            tagsToStore = JSON.stringify([]);
        }

        await dbQuery(
            "UPDATE servers SET url = ?, tags = ?, updated_at = NOW() WHERE id = ? AND status<>'blocked'",
            [url, tagsToStore, id]
        );

        const updated = await dbQuery("SELECT * FROM servers WHERE id = ? LIMIT 1", [id]);
        res.json({ok: true, server: updated[0]});
    }));
}
