
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin, autoUnapproveViolators, getUser } = deps;

    app.post("/servers/:id/rate", requireAuth, asyncHandler(async (req, res) => {
        const { id } = req.params;
        const rating = parseInt(req.body.rating, 10);
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ ok: false, error: "Invalid rating" });


        const userId = req.user.id;
        let reviewUser = await getUser(userId);

        if(reviewUser?.can_review !== 1){
            return res.status(404).json({ ok:false, error:"You cant review this server" });
        }

        const srv = await dbQuery("SELECT id FROM servers WHERE id = ? LIMIT 1", [id]);
        if (!srv || srv.length === 0) return res.status(404).json({ ok: false, error: "Server not found" });

        await dbQuery(
            `INSERT INTO server_ratings (server_id, user_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), created_at = NOW()`,
            [id, userId, rating]
        );

        const agg = await dbQuery(
            `SELECT ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS rating_count
         FROM server_ratings WHERE server_id = ?`,
            [id]
        );

        const rawAvg = agg?.[0]?.avg_rating;
        const rawCount = agg?.[0]?.rating_count;

        const avg = rawAvg == null ? 0 : parseFloat(String(rawAvg));
        const count = rawCount == null ? 0 : Number(rawCount);

        autoUnapproveViolators();

        return res.json({ ok: true, avg, count, myRating: rating });
    }));
}
