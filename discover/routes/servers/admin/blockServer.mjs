export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin, getOwnerFromServerId, createSystemMsg } = deps;

    app.post("/servers/:id/block", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
        const {id} = req.params;
        const {reason} = req.body;

        await dbQuery("UPDATE servers SET status='blocked' WHERE id=?", [id]); /* db */

        let server = await dbQuery("SELECT * FROM servers WHERE id=?", [id]);
        let owner = await getOwnerFromServerId(id)
        await createSystemMsg(owner.id, `Your server (${server[0].url}) has been banned! Reason: ${reason}`, "error");

        return res.json({ok: true});
    }));
}
