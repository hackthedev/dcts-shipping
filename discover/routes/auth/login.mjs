import bcrypt from "bcryptjs";

export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken, dbQuery } = deps;

    app.post("/auth/login", asyncHandler(async (req, res) => {
        const {email, password} = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ok: false, error: "Missing fields"});
        }

        const rows = await dbQuery("SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1", [email]);

        const user = rows[0];
        if (!user) return res.status(401).json({ok: false, error: "Invalid credentials"});

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ok: false, error: "Invalid credentials"});

        const token = signToken({id: user.id, role: user.role || "user"});
        res.json({ok: true, token, user: {id: user.id, email: user.email, role: user.role || "user"}});
    }));
}
