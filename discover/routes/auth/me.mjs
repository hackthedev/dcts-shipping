export default function registerRoute(app, deps) {
    const { requireAuth } = deps;

    app.get("/auth/me", requireAuth, (req, res) => {
        res.json({ok: true, user: {id: req.user.id, role: req.user.role}});
    });
}
