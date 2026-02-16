import {queryDatabase} from "./mysql.mjs";
import {XMLHttpRequest, fetch, serverconfig} from "../../../index.mjs";
import Logger from "@hackthedev/terminal-logger"
import fs from "fs";
import {spawn} from "child_process";


export async function exportDatabaseFromPool(pool, outFile) {
    return;
    let host = process.env.DB_HOST || serverconfig.serverinfo.sql.host;
    let user = process.env.DB_USER || serverconfig.serverinfo.sql.username;
    let password = process.env.DB_PASS || serverconfig.serverinfo.sql.password;
    let database = process.env.DB_NAME || serverconfig.serverinfo.sql.database;

    return await new Promise((resolve, reject) => {
        const dump = spawn("mariadb-dump", [
            "-h", host,
            "-u", user,
            `-p${password}`,
            database
        ]);

        const stream = fs.createWriteStream(outFile);

        dump.stdout.pipe(stream);
        dump.stderr.on("data", d => reject(d.toString()));
        dump.on("close", code => code === 0 ? resolve() : reject(code));
    });
}

export async function saveMemberToDB(id, data) {
    if (!data || typeof data !== "object" || !id) return console.log("[saveMemberToDB] invalid data", data);

    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map(() => "?").join(",");

    const sql = `
        INSERT INTO members (${cols.join(",")})
        VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE
                                 ${cols.map(c => `${c}=VALUES(${c})`).join(",")}
    `;


    try {
        await queryDatabase(sql, vals);
    } catch (err) {
        Logger.debug(err);
    }
}




export async function loadMembersFromDB() {
    if (!serverconfig || typeof serverconfig !== "object") return;

    if (!serverconfig.servermembers || typeof serverconfig.servermembers !== "object") {
        serverconfig.servermembers = {};
    }

    const rows = await queryDatabase("SELECT * FROM members");
    if (!Array.isArray(rows)) return;

    for (const row of rows) {
        serverconfig.servermembers[row.id] = row;
    }

    const sys = {
        id: "system",
        name: "System",
        icon: "/img/default_icon.png",
        token: ""
    };

    await saveMemberToDB("system", sys);

    const [systemRow] = await queryDatabase(
        "SELECT * FROM members WHERE id = ?",
        ["system"]
    );
    if (systemRow) {
        serverconfig.servermembers.system = systemRow;
    }
}


export async function cacheMediaUrl(url, mediaType) {
    const query = `INSERT
    IGNORE INTO url_cache (url, media_type) VALUES (?, ?)`;
    return await queryDatabase(query, [url, mediaType]);
}

export async function getMediaUrlFromCache(url) {
    const query = `SELECT media_type
                   FROM url_cache
                   WHERE url = ?`;
    return await queryDatabase(query, [url]);
}

export async function saveReport(reportCreator, reportedUser, reportType, reportData = null, reportNotes = null) {
    const query = `INSERT INTO reports (reportCreator, reportedUser, reportType, reportData, reportNotes)
                   VALUES (?, ?, ?, ?, ?)`;
    return await queryDatabase(query, [reportCreator, reportedUser, reportType, reportData, reportNotes]);
}

export async function getReports(filter = "") {
    const query = `SELECT *
                   FROM reports ${filter}`;
    return await queryDatabase(query, []);
}

export async function deleteReport(reportId) {
    const query = `DELETE
                   FROM reports
                   WHERE id = ?`;
    return await queryDatabase(query, [reportId]);
}

export async function saveChatMessageInDb(message) {
    const query = `
        INSERT INTO messages (authorId, messageId, message, room)
        VALUES (?, ?, ?, ?) ON DUPLICATE KEY
        UPDATE
            message =
        VALUES (message), room =
        VALUES (room)
    `;

    const encodedMessage = JSON.stringify(message);
    return await queryDatabase(query, [message.author.id, message.messageId, encodedMessage, message.room]);
}

export async function logEditedChatMessageInDb(message) {
    const query = `
        INSERT INTO message_logs (authorId, messageId, message, room)
        VALUES (?, ?, ?, ?)
    `;

    message.editedTimestamp = new Date().getTime();
    const encodedMessage = JSON.stringify(message);
    return await queryDatabase(query, [message.author.id, message.messageId, encodedMessage, message.room]);
}

export function leaveAllRooms(socket, memberId = null) {
    const rooms = socket.rooms;
    rooms.forEach((room) => {
        if (room !== socket.id && room !== memberId && !room.startsWith("vc_")) { // Exclude the socket's own room
            socket.leave(room);
        }
    });
}

export function encodeToBase64(jsonString) {
    return btoa(encodeURIComponent(jsonString));
}

export function decodeFromBase64(base64String) {
    return decodeURIComponent(atob(base64String));
}

export function escapeJSONString(str) {
    return str.replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t');  // Escape tabs
}

export async function markInboxMessageAsRead(memberId, inboxId) {
    if (!memberId) throw new Error("No member id provided");
    if (!inboxId) throw new Error("No inbox id provided");

    if(!inboxId.includes("-")){
        await queryDatabase(
            `UPDATE inbox SET isRead = 1 WHERE memberId = ? AND inboxId = ?`,
            [memberId, inboxId]
        );
    }
    else{
        await queryDatabase(
            `UPDATE inbox SET isRead = 1 WHERE memberId = ? AND customId = ?`,
            [memberId, inboxId]
        );
    }
}


export async function addInboxMessage(memberId, data = {}, type = "general", customId = null) {
    let query = `INSERT INTO inbox (memberId, type, data, createdAt)
                 VALUES (?, ?, ?, ?)`;

    if (customId) {
        query = `INSERT
        INTO inbox (memberId, type, data, createdAt, customId) VALUES (?, ?, ?, ?, ?)`;
        return await queryDatabase(query, [memberId, type, JSON.stringify(data), new Date().getTime(), customId]);
    }

    return await queryDatabase(query, [memberId, type, JSON.stringify(data), new Date().getTime()]);
}

export async function getInboxMessages({
                                           memberId,
                                           index = -1,
                                           inboxId = null,
                                           onlyUnread = false
                                       } = {}) {

    if (inboxId !== null) {
        const query = `SELECT *
                       FROM inbox
                       WHERE inboxId = ? LIMIT 50`;
        return await queryDatabase(query, [inboxId]);
    }

    if (index === -1 && !onlyUnread) {
        const query = `SELECT *
                       FROM inbox
                       WHERE memberId = ?
                       ORDER BY createdAt DESC LIMIT 100`;
        return await queryDatabase(query, [memberId]);
    }

    return await getUnreadInbox(memberId, index);

    async function getUnreadInbox(memberId, index = -1){
        if(index !== -1){
            const query = `SELECT *
                       FROM inbox
                       WHERE memberId = ?
                         AND createdAt < ?
                         AND isRead = 0
                       ORDER BY createdAt DESC LIMIT 50`;
            return await queryDatabase(query, [memberId, index]);
        }

        const query = `SELECT *
                       FROM inbox
                       WHERE memberId = ?
                         AND isRead = 0
                       ORDER BY createdAt DESC LIMIT 50`;
        return await queryDatabase(query, [memberId]);
    }
}


export async function getChatMessagesFromDb(roomId, index, msgId = null) {
    if (msgId != null) {
        const query = `SELECT *
                       FROM messages
                       WHERE messageId = ?`;
        return await queryDatabase(query, [msgId]);
    }

    if (index === -1) {
        const query = `SELECT *
                       FROM messages
                       WHERE room = ?
                       ORDER BY createdAt DESC LIMIT 50`;
        return await queryDatabase(query, [roomId]);
    } else {
        const query = `SELECT *
                       FROM messages
                       WHERE room = ?
                         AND createdAt < ?
                       ORDER BY createdAt DESC LIMIT 50`;
        return await queryDatabase(query, [roomId, Number(index)]);
    }
}

export async function getChatMessageById(msgId) {
    if(typeof msgId !== "string" && typeof msgId !== "number") throw new Error("Invalid message id. Excepted string or number");

    // nothing was supplied
    if (!msgId) {
        Logger.warn("Cannot get message without message id")
        return;
    }

    const query = `SELECT *
                   FROM messages
                   WHERE messageId = ?`;
    return await queryDatabase(query, [msgId]);
}

export async function getMessageLogsFromDb(msgId) {

    // nothing was supplied
    if (!msgId) {
        Logger.warn("Cannot get message logs without message id")
        return;
    }

    const query = `SELECT *
                   FROM message_logs
                   WHERE messageId = ?`;
    return await queryDatabase(query, [msgId]);
}

export async function deleteChatMessagesFromDb(messageId) {
    if (!messageId) {
        Logger.warn("Tried to delete a message from the db but the message id was null");
        Logger.warn(messageId)
        return;
    }

    // dm message
    if (messageId?.startsWith("m_")) {
        const query = `DELETE
                       FROM dms_messages
                       WHERE messageId = ?`;
        return await queryDatabase(query, [messageId]);
    }

    const query = `DELETE
                   FROM messages
                   WHERE messageId = ?`;
    return await queryDatabase(query, [messageId]);
}

export async function getStringSizeInBytes(str) {
    const encoder = new TextEncoder();
    const encodedStr = encoder.encode(str);
    return encodedStr.length;
}

export async function getStringSizeInMegabytes(str) {
    const bytes = await getStringSizeInBytes(str);
    return bytes / (1024 * 1024); // Convert bytes to MB
}

// Same as in chat.js
export async function checkMediaTypeAsync(url) {
    try {
        const response = await fetch(url, {method: 'HEAD'});

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('Content-Type');

        if (!contentType) {
            throw new Error('Content-Type header is missing');
        }

        if (contentType.startsWith('audio/')) {
            return 'audio';
        } else if (contentType.startsWith('video/')) {
            return 'video';
        } else if (contentType.startsWith('image/')) {
            return 'image';
        } else {
            return 'unknown';
        }
    } catch (error) {
        if (error.message.includes("404")) return;
        return 'error';
    }
}

export function isURL(text) {
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:';
    } catch (err) {
        return false;
    }
}
