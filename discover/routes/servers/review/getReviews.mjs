
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin } = deps;

    app.get("/servers/:id/rating", asyncHandler(async (req, res) => {
        const { id } = req.params;

        const srv = await dbQuery("SELECT id FROM servers WHERE id = ? LIMIT 1", [id]);
        if (!srv || srv.length === 0) return res.status(404).json({ ok: false, error: "Server not found" });

        const agg = await dbQuery(
            `SELECT ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS rating_count
         FROM server_ratings WHERE server_id = ?`,
            [id]
        );

        const rawAvg = agg?.[0]?.avg_rating;
        const rawCount = agg?.[0]?.rating_count;

        const avg = rawAvg == null ? 0 : parseFloat(String(rawAvg));
        const count = rawCount == null ? 0 : Number(rawCount);

        return res.json({ ok: true, avg, count });
    }));
}
