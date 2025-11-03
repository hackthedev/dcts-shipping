
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin, autoUnapproveViolators } = deps;

    app.get("/servers", asyncHandler(async (req, res) => {
        const rows = await dbQuery("SELECT * FROM servers WHERE status='approved' ORDER BY last_checked DESC"); /* db */
        return res.json({ ok: true, servers: rows });
    }));
}
