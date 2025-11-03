export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin } = deps;

    app.post("/admin/reports/:id/action", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { action } = req.body || {};
        if (!action || !["in_progress","close","open"].includes(action)) return res.status(400).json({ ok:false, error:"Invalid action" });

        if (action === "in_progress") {
            await dbQuery("UPDATE server_reports SET status='in_progress', handled_by=?, handled_at=NOW() WHERE id=?", [req.user.id, id]);
        } else if (action === "close") {
            await dbQuery("UPDATE server_reports SET status='closed', handled_by=?, handled_at=NOW() WHERE id=?", [req.user.id, id]);
        } else if (action === "open") {
            await dbQuery("UPDATE server_reports SET status='open', handled_by=NULL, handled_at=NULL WHERE id=?", [id]);
        }
        return res.json({ ok:true });
    }));
}
