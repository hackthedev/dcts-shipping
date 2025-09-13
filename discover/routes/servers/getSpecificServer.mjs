

export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery } = deps;

    app.get("/servers/:id", asyncHandler(async (req, res) => {
        const {id} = req.params;
        const rows = await dbQuery("SELECT * FROM servers WHERE id=?", [id]); /* db */
        return res.json({ok: true, server: rows[0]});
    }));
}
