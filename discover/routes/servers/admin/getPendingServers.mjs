
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin } = deps;

    app.get("/servers/pending", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
        const rows = await dbQuery(
            "SELECT * FROM servers WHERE status <> 'approved' AND NOT status='blocked' ORDER BY created_at DESC", []
        ); /* db */

        res.json({ok: true, servers: rows});
    }));
}
