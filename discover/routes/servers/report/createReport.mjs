export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin, autoUnapproveViolators, getUser } = deps;

    app.post("/servers/:id/report", requireAuth, asyncHandler(async (req, res) => {
        const { id } = req.params;
        const reason = String(req.body.reason || "").trim().slice(0, 100);
        const details = String(req.body.details || "").trim().slice(0, 2000);
        if (!reason) return res.status(400).json({ ok:false, error:"Missing reason" });


        const reporter = req.user.id;
        let reportUser = await getUser(reporter);

        if(reportUser?.can_report !== 1){
            return res.status(404).json({ ok:false, error:"You cant report this server" });
        }

        const srv = await dbQuery("SELECT id FROM servers WHERE id = ? LIMIT 1", [id]);
        if (!srv || srv.length === 0) return res.status(404).json({ ok:false, error:"Server not found" });

        const result = await dbQuery(
            "INSERT INTO server_reports (server_id, reporter_id, reason, details) VALUES (?, ?, ?, ?)",
            [id, reporter, reason, details]
        );

        autoUnapproveViolators();

        return res.status(201).json({ ok:true, id: result.insertId || null });
    }));
}
