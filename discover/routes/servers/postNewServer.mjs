
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, tagLength } = deps;

    app.post("/servers", requireAuth, asyncHandler(async (req, res) => {
        const url = String(req.body.url || "").trim();
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok:false, error: "URL must start with https://" });

        let tags = [];
        if (Array.isArray(req.body.tags)) {
            tags = req.body.tags.map(t => String(t || "").trim().slice(0, tagLength)).filter(Boolean);
        } else if (req.body.tags) {
            tags = String(req.body.tags)
                .split(",")
                .map(t => t.trim().slice(0, tagLength))
                .filter(Boolean);
        }

        const tagsToStore = JSON.stringify(tags);

        const result = await dbQuery(
            "INSERT INTO servers (owner_id, url, tags, created_at, status) VALUES (?, ?, ?, NOW(), 'pending')",
            [req.user.id, url, tagsToStore]
        );

        return res.status(201).json({ ok: true, id: result.insertId || null });
    }));

}
