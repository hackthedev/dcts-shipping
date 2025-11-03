
export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth } = deps;

    app.delete("/servers/:id", requireAuth, asyncHandler(async (req, res) => {
        const {id} = req.params;
        await dbQuery("DELETE FROM servers WHERE id=? AND owner_id=? AND status<>'blocked'", [id, req.user.id]); /* db */
        return res.json({ok: true});
    }));
}
