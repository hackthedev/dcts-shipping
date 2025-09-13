export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin } = deps;

    app.get("/admin/reports", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
        const rows = await dbQuery(
            `SELECT r.id, r.server_id, r.reporter_id, r.reason, r.details, r.status,
                    r.handled_by,
                    DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                    DATE_FORMAT(r.handled_at, '%Y-%m-%d %H:%i:%s') AS handled_at,
                    s.url AS server_url, s.owner_id, u.email AS reporter_email
             FROM server_reports r
                      LEFT JOIN servers s ON s.id = r.server_id
                      LEFT JOIN users u ON u.id = r.reporter_id
             WHERE r.status <> "closed"
             ORDER BY r.created_at DESC
            `
        );
        return res.json({ ok:true, reports: rows });
    }));
}
