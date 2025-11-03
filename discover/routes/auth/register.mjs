import bcrypt from "bcryptjs";

export default function registerRoute(app, deps) {
    const { pool, asyncHandler, signToken } = deps;

    app.post("/auth/register", asyncHandler(async (req, res) => {
        let { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ ok: false, error: "Missing fields" });

        email = String(email).trim().toLowerCase();

        const conn = await pool.getConnection();
        try {
            const lockName = "reg_email_" + Buffer.from(email).toString("hex").slice(0, 60);
            const lockRes = await conn.query("SELECT GET_LOCK(?, 10) AS got", [lockName]);
            const got = lockRes && lockRes[0] ? Number(lockRes[0].got) : 0;
            if (got !== 1) {
                conn.release();
                return res.status(503).json({ ok: false, error: "Could not acquire lock, try again" });
            }

            try {
                const exists = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
                if (Array.isArray(exists) && exists.length) {
                    await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);
                    conn.release();
                    return res.status(409).json({ ok: false, error: "User exists" });
                }

                const hash = await bcrypt.hash(password, 12);
                let result;
                try {
                    result = await conn.query(
                        "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, NOW())",
                        [email, hash, "user"]
                    );
                } catch (err) {
                    await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);
                    conn.release();
                    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
                        return res.status(409).json({ ok: false, error: "User exists" });
                    }
                    throw err;
                }

                await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);

                let id = result && result.insertId ? result.insertId : null;
                if (!id) {
                    const rows = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
                    id = rows?.[0]?.id ?? null;
                }

                const token = signToken({ id, role: "user" });
                return res.status(201).json({ ok: true, token, user: { id, email, role: "user" } });
            } finally {
                try { await conn.query("SELECT RELEASE_LOCK(?)", [lockName]); } catch (e) { /* ignore */ }
                conn.release();
            }
        } catch (err) {
            if (conn) conn.release();
            throw err;
        }
    }));
}
