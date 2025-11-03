export default function registerRoute(app, deps) {
    const { dbQuery, requireAuth, asyncHandler, markSystemMsgRead } = deps;

    app.post("/me/messages/:id/", requireAuth, asyncHandler(async (req, res) => {
        const id = req.params.id;

        const rows = await dbQuery("SELECT user_id FROM system_messages WHERE id = ? LIMIT 1", [id]);
        const row = rows?.[0];

        if (!row) return res.status(404).json({ ok:false, error: "Not found" });
        if (row.user_id !== req.user.id) return res.status(403).json({ ok:false, error: "Forbidden" });

        await markSystemMsgRead(id)

        return res.json({ ok: true });
    }));
}