
export default function registerRoute(app, deps) {
    const { getUserSystemMessages, requireAuth, asyncHandler } = deps;

    app.get("/me/messages", requireAuth, asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const unreadOnly = req.query.unreadOnly === "1" || req.query.unreadOnly === "true";
        const messages = await getUserSystemMessages(userId, { unreadOnly });
        return res.json({ ok: true, messages });
    }));
}
