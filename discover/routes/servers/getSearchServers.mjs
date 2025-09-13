export default function registerRoute(app, deps) {
    const {pool, asyncHandler, signToken, dbQuery} = deps;

    app.get("/servers/search/:search", asyncHandler(async (req, res) => {
        const raw = req.params.search ?? "";
        const search = decodeURIComponent(String(raw)).trim();

        if (!search) {
            const rows = await dbQuery(
                "SELECT * FROM servers WHERE status='approved' ORDER BY last_checked DESC"
            );
            return res.json({ok: true, servers: rows});
        }

        if (/^\d+$/.test(search)) {
            const rows = await dbQuery(
                "SELECT * FROM servers WHERE id = ? AND status='approved' LIMIT 1",
                [search]
            );
            return res.json({ok: true, servers: rows.length ? [rows[0]] : []});
        }

        const term = search.toLowerCase();
        const likeExactJson = `%\"${term}\"%`;
        const likeAny = `%${term}%`;

        const rows = await dbQuery(
            `SELECT *
             FROM servers
             WHERE status = 'approved'
               AND (
                 LOWER(tags) LIKE ?
                     OR LOWER(url) LIKE ?
                 )
             ORDER BY last_checked DESC`,
            [likeExactJson, likeAny]
        );

        return res.json({ok: true, servers: rows});
    }));
}
