
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin, createSystemMsg, getOwnerFromServerId } = deps;

    app.post("/servers/:id/deny", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
        const {id} = req.params;
        const {reason} = req.body;

        let server = await dbQuery("SELECT * FROM servers WHERE id=?", [id]);
        let owner = await getOwnerFromServerId(id)
        await createSystemMsg(owner.id, `Your server (${server[0].url}) has been rejected! Reason: ` + reason, "error");

        await dbQuery("DELETE FROM servers WHERE id=?", [id]); /* db */
        return res.json({ok: true});
    }));
}
