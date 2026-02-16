import {db} from "../../index.mjs";

export async function getCache(identifier, type) {
    if (!identifier) throw new Error("identifier not supplied.");
    if (!type) throw new Error("type not supplied.");

    const rows = await db.queryDatabase(
        `
            SELECT *
            FROM cache
            WHERE identifier = ?
              AND type = ?
        `,
        [identifier, type]
    );

    return rows[0];
}

export async function setCache(identifier, type, data) {
    if (!identifier) throw new Error("identifier not supplied.");
    if (!type) throw new Error("type not supplied.");
    if (!data) throw new Error("data not supplied.");

    if(typeof data === "object") data = JSON.stringify(data)

    await db.queryDatabase(
        `
        INSERT INTO cache (identifier, type, data, created)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            data = VALUES(data),
            created = VALUES(created)
        `,
        [identifier, type, data, Date.now()]
    );
}