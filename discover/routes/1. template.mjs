export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery, requireAuth, requireAdmin } = deps;

    app.post("/auth/register", asyncHandler(async (req, res) => {
		// bla bla
    }));
}
