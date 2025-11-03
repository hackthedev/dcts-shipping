export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth } = deps;
    app.get("/servers/mine", requireAuth, asyncHandler(async (req, res) => {
        const rows = await dbQuery(
            "SELECT * FROM servers WHERE owner_id=? ORDER BY created_at DESC",
            [req.user.id]
        ); /* db */
        res.json({ok: true, servers: rows});
    }));
}
