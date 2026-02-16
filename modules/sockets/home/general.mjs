import {io, serverconfig, signer, usersocket, xssFilters} from "../../../index.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger"
import { copyObject, emitBasedOnPermission, getCastingMemberObject, sanitizeInput, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";
import { decodeFromBase64, encodeToBase64 } from "../../functions/mysql/helper.mjs";
import { queryDatabase } from "../../functions/mysql/mysql.mjs";



const clean = (s) => xssFilters.inHTMLData(String(s ?? ""));
const rid = (p = "id") =>
    `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const nowISO = () => new Date().toISOString();


export async function deleteDMMessage(socket, data, response){
    try {
        const me = socket.data.memberId;
        let { messageId } = data || {};
        if(!messageId?.startsWith("m_")) messageId = "m_" + messageId;

        const rows = await queryDatabase(
            `SELECT threadId, authorId FROM dms_messages WHERE messageId = ? LIMIT 1`,
            [messageId]
        );
        if (!rows.length) return response?.({ type: "error", msg: "not found" });
        const { threadId, authorId } = rows[0];

        const [isMember] = await queryDatabase(
            `SELECT 1 FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
            [threadId, me]
        );
        if (!isMember || authorId !== me) return response?.({ type: "error", msg: "forbidden" });

        await queryDatabase(`DELETE FROM dms_messages WHERE messageId = ?`, [messageId]);

        await emitToThread(threadId, "receiveMessageDelete", { threadId, messageId });
        response?.({ type: "success" });
    } catch (e) {
        Logger.error(e);
        response?.({ type: "error", msg: "deleteMessage failed" });
    }
}

export async function sendSystemMessage(targetUserId, text, opts = {}) {
    const systemId = opts.systemId || (serverconfig.systemMemberId || "system");
    const displayName = opts.displayName || "System";
    const markReadForSystem = opts.markReadForSystem !== false; // default true

    if (!targetUserId) throw new Error("missing targetUserId");

    if(typeof text === "string"){
        text = {
            content: text,
            sender: null,
            encrypted: false,
            plainSig: null
        }
    }

    // if target user not known in serverconfig, bail
    if (!serverconfig.servermembers[targetUserId]) {
        Logger.warn("sendSystemMessage: unknown target user", targetUserId);
        return false;
    }

    // try find existing 1:1 DM between systemId and targetUserId
    const [existing] = await queryDatabase(
        `SELECT t.threadId
     FROM dms_threads t
     JOIN dms_participants p1 ON p1.threadId = t.threadId AND p1.memberId = ?
     JOIN dms_participants p2 ON p2.threadId = t.threadId AND p2.memberId = ?
     WHERE t.type = 'dm'
     LIMIT 1`,
        [systemId, targetUserId]
    );

    let threadId;
    if (existing && existing.threadId) {
        threadId = existing.threadId;
    } else {
        // create a new thread
        threadId = rid("t");
        const title = `${displayName} → ${serverconfig.servermembers[targetUserId]?.name || targetUserId}`;
        await queryDatabase(`INSERT INTO dms_threads (threadId, type, title) VALUES (?, 'dm', ?)`, [threadId, title]);
        await queryDatabase(`INSERT INTO dms_participants (threadId, memberId) VALUES (?, ?)`, [threadId, systemId]);
        await queryDatabase(`INSERT INTO dms_participants (threadId, memberId) VALUES (?, ?)`, [threadId, targetUserId]);

        // build thread object to emit
        const threadOut = await buildThreadOut(threadId);
        // notify both participants (room is memberId because users join their memberId room on join)
        io.to(systemId).emit("receiveThreadNew", { thread: threadOut });
        io.to(targetUserId).emit("receiveThreadNew", { thread: threadOut });
    }

    // create message
    const messageId = rid("m");
    const now = new Date();
    const encoded = String(JSON.stringify(text) || "");

    await queryDatabase(
        `INSERT INTO dms_messages (messageId, threadId, authorId, message, createdAt, supportIdentity, displayName)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [messageId, threadId, systemId, encoded, now, "system", displayName]
    );

    // optionally mark the message as read for the system participant so system doesn't get "unread"
    if (markReadForSystem) {
        try {
            await queryDatabase(
                `INSERT INTO dms_reads (threadId, memberId, last_read_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE last_read_at = VALUES(last_read_at)`,
                [threadId, systemId, now]
            );
        } catch (e) {
            Logger.error("sendSystemMessage: failed to mark read for system", e);
        }
    }

    // prepare message payload in the same shape clients expect
    const message = {
        id: messageId,
        authorId: systemId,
        text: encoded,
        ts: now,
        supportIdentity: "system",
        displayName
    };

    // emit to participants
    await emitToThread(threadId, "receiveMessage", { threadId, message });

    return { type: "success", threadId, messageId };
}

async function isStaff(userId) {
    try {
        return await hasPermission(userId, ["manageTickets"])
    } catch {
        return false;
    }
}

async function emitToThread(threadId, event, payload) {
    const rows = await queryDatabase(
        `SELECT memberId FROM dms_participants WHERE threadId = ?`,
        [threadId]
    );
    for (const r of rows) {
        try {
            const memberId = String(r.memberId);
            const sockId = usersocket[memberId];

            io.to(memberId).emit(event, payload);
        } catch (err) {
            Logger.error("emitToThread: emit failed for member", r.memberId, err);
            // continue to next participant
        }
    }
}


async function buildThreadOut(threadId, memberId = null) {
    const [t] = await queryDatabase(
        `SELECT t.threadId, t.type, t.title, k.status, k.createdAt AS tCreated
         FROM dms_threads t
         LEFT JOIN tickets k ON k.threadId = t.threadId
         WHERE t.threadId = ? LIMIT 1`,
        [threadId]
    );
    if (!t) return null;

    const parts = await queryDatabase(
        `SELECT memberId FROM dms_participants WHERE threadId = ?`,
        [threadId]
    );
    const [last] = await queryDatabase(
        `SELECT message AS lastText, createdAt AS lastAt
         FROM dms_messages
         WHERE threadId = ?
         ORDER BY createdAt DESC, messageId DESC
         LIMIT 1`,
        [threadId]
    );

    let unread = 0;
    if (memberId) {
        const [uRow] = await queryDatabase(
            `SELECT COUNT(*) AS unread
                FROM dms_messages d
                LEFT JOIN dms_reads r ON r.threadId = d.threadId AND r.memberId = ?
                WHERE d.threadId = ?
                AND (r.last_read_at IS NULL OR d.createdAt > r.last_read_at)
                AND d.authorId != ?`,
            [memberId, threadId, memberId]
        );
        unread = Number(uRow?.unread || 0);
    }

    let lastDecoded = '';
    try {
        if (last?.lastText) {
            const decoded = decodeFromBase64(last.lastText);
            const parsed = JSON.parse(decoded);
            lastDecoded = parsed?.content || '';
        }
    } catch (e) {
        lastDecoded = '';
    }


    return {
        id: t.threadId,
        type: t.type,
        title: t.title,
        participants: parts.map(p => p.memberId),
        last: lastDecoded || '',
        lastAt: last?.lastAt || t.tCreated || null,
        unread,
        status: t.status || 'open',
        messages: []
    };
}



export default (io) => (socket) => {

    socket.on("deleteThread", async function (data, response) {
        if (validateMemberId(data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {
            try {
                const me = data.memberId;
                const threadId = data?.threadId;

                const rows = await queryDatabase(
                    `SELECT memberId FROM dms_participants WHERE threadId = ?`,
                    [threadId]
                );

                if (!rows.length) return response?.({ type: "error", msg: "not found" });

                const isMember = rows.some(r => r.memberId === me);
                if (!isMember) return response?.({ type: "error", msg: "forbidden" });

                const participants = rows.map(r => r.memberId);

                await queryDatabase(`DELETE FROM dms_message_logs WHERE threadId = ?`, [threadId]);
                await queryDatabase(`DELETE FROM dms_messages WHERE threadId = ?`, [threadId]);
                await queryDatabase(`DELETE FROM dms_reads WHERE threadId = ?`, [threadId]);
                await queryDatabase(`DELETE FROM dms_participants WHERE threadId = ?`, [threadId]);
                await queryDatabase(`DELETE FROM dms_threads WHERE threadId = ?`, [threadId]);
                await queryDatabase(`DELETE FROM tickets WHERE threadId = ?`, [threadId]);

                for (const uid of participants) {
                    io.to(uid).emit("threadDeleted", { threadId });
                }
                response?.({ type: "success" });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "deleteThread failed" });
            }
        }
    });



    socket.on("markRead", async function (data, response) {
        if (validateMemberId(data?.id, socket, data?.token) === true) {
            try {
                const me = data.id;
                const { threadId, ts } = data || {};
                const [isMemberRow] = await queryDatabase(
                    `SELECT 1 FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
                    [threadId, me]
                );

                let allowed = !!isMemberRow;
                if (!allowed && await isStaff(me)) allowed = true;
                if (!allowed) return response?.({ type: "error", msg: "forbidden" });

                const when = ts || nowISO();
                await queryDatabase(
                    `INSERT INTO dms_reads (threadId, memberId, last_read_at)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE last_read_at = VALUES(last_read_at)`,
                    [threadId, me, when]
                );

                Logger.debug("Sending updateunread to " + data.id)
                io.to(data.id).emit('updateUnread');

                response?.({ type: "success", last_read_at: when });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "markRead failed" });
            }
        }
        else{
            response?.({ type: "error", msg: "auth failed" });
        }
    });

    socket.on("fetchMessages", async function (data, response) {
        if (validateMemberId(socket.data.memberId, socket, serverconfig.servermembers[data.id].token) === true) {
            try {
                const me = socket.data.memberId;
                const threadId = data?.threadId;
                const limit = Math.min(parseInt(data?.limit || 50, 10) || 50, 200);

                const [isMemberRow] = await queryDatabase(
                    `SELECT 1 FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
                    [threadId, me]
                );
                let allowed = !!isMemberRow;
                if (!allowed && await isStaff(me)) allowed = true;
                if (!allowed) return response?.({ type: "error", msg: "forbidden" });

                const rows = await queryDatabase(
                    `SELECT authorId, messageId, threadId, message, createdAt, supportIdentity, displayName
                    FROM dms_messages
                    WHERE threadId = ?
                    ORDER BY createdAt DESC, messageId DESC
                    LIMIT ?`,
                    [threadId, limit]
                );

                const messages = rows.map(r => {
                    let text;
                    try {
                        text = JSON.parse(decodeFromBase64(r.message));
                    } catch {
                        text = JSON.parse(r.message);
                    }

                    return {
                        id: r.messageId,
                        authorId: r.authorId,
                        text,
                        ts: r.createdAt || null,
                        supportIdentity: r.supportIdentity || 'self',
                        displayName: r.displayName || null
                    };
                }).reverse();


                io.to(data.id).emit('updateUnread');

                response?.({ type: "success", messages });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "fetchMessages failed" });
            }
        }
    });




    socket.on("joinServer", async function (_member, response) {
        try {
            if (!validateMemberId(_member?.id, socket, serverconfig.servermembers[_member.id].token) === true) {
                response?.({ type: "error", msg: "invalid member in join server home" });
                return;
            }

            if (serverconfig.servermembers[_member.id].token !== _member.token) {
                response?.({ type: "error", msg: "invalid token" });
                return;
            }

            const myId = String(_member?.id || "");
            if (!myId) { response?.({ type: "error", msg: "no member id" }); return; }

            socket.data.memberId = myId;
            socket.join(myId);

            const members = Object.values(copyObject(serverconfig.servermembers) || {}).map(getCastingMemberObject);

            const threads = await queryDatabase(
                `SELECT t.threadId, t.type, t.title, k.status
                FROM dms_threads t
                JOIN dms_participants p ON p.threadId = t.threadId
                LEFT JOIN tickets k ON k.threadId = t.threadId
                WHERE p.memberId = ?`,
                [myId]
            );

            const threadIds = threads.map(t => t.threadId);

            let participants = [];
            if (threadIds.length) {
                const placeholders = threadIds.map(() => '?').join(',');
                participants = await queryDatabase(
                    `SELECT threadId, memberId FROM dms_participants WHERE threadId IN (${placeholders})`,
                    threadIds
                );
            }

            const lastRows = threadIds.length ? await queryDatabase(
                `
            SELECT m.threadId, m.message AS lastText, m.createdAt AS lastAt
            FROM dms_messages m
            JOIN (
                SELECT threadId, MAX(createdAt) AS maxCreated
                FROM dms_messages
                WHERE threadId IN (${threadIds.map(() => '?').join(',')})
                GROUP BY threadId
            ) x ON x.threadId = m.threadId AND x.maxCreated = m.createdAt
            `,
                threadIds
            ) : [];

            const lastMap = Object.fromEntries(
                lastRows.map(r => {
                    let decoded = '';
                    try {
                        const raw = decodeFromBase64(r.lastText || '');
                        const parsed = JSON.parse(raw);
                        decoded = parsed?.content || '';
                    } catch {}
                    return [r.threadId, { lastText: decoded, lastAt: r.lastAt }];
                })
            );

            const unreadRows = threadIds.length ? await queryDatabase(
                `
            SELECT d.threadId, COUNT(*) AS unread
            FROM dms_messages d
            LEFT JOIN dms_reads r
              ON r.threadId = d.threadId
              AND r.memberId = ?
            WHERE d.threadId IN (${threadIds.map(() => '?').join(',')})
              AND (r.last_read_at IS NULL OR d.createdAt > r.last_read_at)
              AND d.authorId != ?
            GROUP BY d.threadId
            `,
                [myId, ...threadIds, myId]
            ) : [];
            const unreadMap = Object.fromEntries(unreadRows.map(r => [r.threadId, Number(r.unread)]));

            const threadsOut = threads.map(t => ({
                id: t.threadId,
                type: t.type,
                title: t.title,
                status: t.status || (t.type === 'ticket' ? 'open' : null),
                participants: participants.filter(p => p.threadId === t.threadId).map(p => p.memberId),
                last: lastMap[t.threadId]?.lastText || "",
                lastAt: lastMap[t.threadId]?.lastAt || null,
                unread: unreadMap[t.threadId] || 0,
                messages: []
            }));

            // fetch unread content rows for this user (posts/news/help)
            let unreadContent = [];
            try {
                const unreadRows = await queryDatabase(
                    `SELECT contentType, contentId FROM content_reads WHERE userId = ? AND readAt IS NULL`,
                    [myId]
                );
                unreadContent = (unreadRows || []).map(r => `${r.contentType}:${r.contentId}`);
            } catch (e) {
                Logger.error('fetch unread content failed', e);
            }


            socket.emit("receiveHydrate", {
                members,
                threads: threadsOut,
                posts: await queryDatabase(`SELECT id, title, body, authorId, tag, pinned, createdAt FROM posts ORDER BY id DESC`, []),
                news: await queryDatabase(`SELECT id, title, body, authorId, pinned, createdAt FROM news ORDER BY id DESC`, []),
                help: await queryDatabase(`SELECT id, slug, title, body, authorId, pinned, createdAt FROM help ORDER BY id DESC`, []),
                unreadContent
            });
            response?.({ type: "success" });
        } catch (e) {
            Logger.error(e);
            response?.({ type: "error", msg: "hydrate failed" });
        }
    });



    socket.on("createThread", async function (data, response) {
        if (validateMemberId(socket.data.memberId, socket, serverconfig.servermembers[data.id].token) === true) {
            try {
                const me = socket.data.memberId;
                if (!me) return response?.({ type: "error", msg: "unauthorized" });

                const threadId = rid("t");
                const type = data?.type || "dm";
                const title = clean(data?.title || "");
                const participants = Array.from(new Set(data?.participants || []));
                if (!participants.includes(me)) participants.push(me);

                await queryDatabase(
                    `INSERT INTO dms_threads (threadId, type, title) VALUES (?, ?, ?)`,
                    [threadId, type, title]
                );
                for (const uid of participants) {
                    await queryDatabase(
                        `INSERT INTO dms_participants (threadId, memberId) VALUES (?, ?)`,
                        [threadId, uid]
                    );
                }

                if (type === 'ticket') {
                    const now = new Date();
                    await queryDatabase(
                        `INSERT INTO tickets (threadId, creatorId, status, createdAt, updatedAt)
                        VALUES (?, ?, 'open', ?, ?)
                        ON DUPLICATE KEY UPDATE updatedAt = VALUES(updatedAt)`,
                        [threadId, me, now, now]
                    );
                }

                const thread = await buildThreadOut(threadId);

                for (const uid of participants) {
                    io.to(uid).emit("receiveThreadNew", { thread });
                }

                if (type === 'ticket') {
                    io.to('staff').emit('ticket:new', { thread });
                    emitBasedOnPermission("manageTickets", "updateUnread")
                }

                response?.({ type: 'success', threadId });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "createThread failed" });
            }
        }
    });



    socket.on("fetchThreads", async function (_member, response) {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[_member.id].token == _member.token) {
            try {
                const threads = await queryDatabase(
                    `SELECT threadId, type, title FROM dms_threads`,
                    []
                );
                const participants = await queryDatabase(
                    `SELECT threadId, memberId FROM dms_participants`,
                    []
                );
                const out = threads.map((t) => ({
                    id: t.threadId,
                    type: t.type,
                    title: t.title,
                    participants: participants
                        .filter((p) => p.threadId === t.threadId)
                        .map((p) => p.memberId),
                    last: "",
                    messages: []
                }));
                response?.({ type: "success", threads: out });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error" });
            }
        }
    });



    socket.on("sendMessage", async (data, response) => {
        try {
            if (!validateMemberId(socket.data.memberId, socket)) {
                return response?.({ type: 'error', msg: 'unauthorized' });
            }
            if (serverconfig.servermembers[data.id].token !== data.token) {
                return response?.({ type: 'error', msg: 'invalid token' });
            }

            const me = socket.data.memberId;
            const messageId = "m_" + Date.now();
            const now = new Date();

            data.text.content = sanitizeInput(data.text.content);
            data.text.sender = sanitizeInput(data.text.sender);
            data.text.plainSig = sanitizeInput(data.text.plainSig);
            data.authorName = sanitizeInput(data.authorName);

            const [isMember] = await queryDatabase(
                `SELECT 1 FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
                [data.threadId, me]
            );
            if (!isMember) return response?.({ type: 'error', msg: 'forbidden' });

            // check if ma guy is chatting with system user
            const [isChattingWithSystem] = await queryDatabase(
                `SELECT memberId FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
                [data.threadId, "system"]
            );
            if (isChattingWithSystem) return; // dont need to chat with system

            let displayName = null;
            if (data.supportIdentity === "support_anon") {
                displayName = "Support Team";
            } else if (data.supportIdentity === "support_tagged") {
                displayName = `[Support Team] ${data.authorName || "Staff"}`.trim();
            }

            /*
                Potential automod text checking
            */

            await queryDatabase(
                `INSERT INTO dms_messages (messageId, threadId, authorId, message, createdAt, supportIdentity, displayName)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [messageId, data.threadId, me, sanitizeInput(JSON.stringify(data.text)), now, data.supportIdentity || "self", displayName]
            );

            // mark as read for sender
            await queryDatabase(
                `INSERT INTO dms_reads (threadId, memberId, last_read_at)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE last_read_at = VALUES(last_read_at)`,
                [data.threadId, me, now]
            );

            const message = {
                id: messageId,
                authorId: me,
                text: data.text,
                ts: now,
                supportIdentity: data.supportIdentity || "self",
                displayName
            };


            await emitToThread(data.threadId, "receiveMessage", { threadId: data.threadId, message });

            // inform staff members even if they're not participants
            const [t] = await queryDatabase(
                `SELECT type FROM dms_threads WHERE threadId = ? LIMIT 1`,
                [data.threadId]
            );
            if (t?.type === 'ticket') {
                const participants = await queryDatabase(
                    `SELECT memberId FROM dms_participants WHERE threadId = ?`,
                    [data.threadId]
                );
                const pSet = new Set(participants.map(r => String(r.memberId)));

                const staffRoom = io.sockets.adapter.rooms.get('staff') || new Set();
                for (const sid of staffRoom) {
                    const s = io.sockets.sockets.get(sid);
                    const uid = String(s?.data?.memberId || '');
                    if (uid && !pSet.has(uid)) {
                        s.emit('ticket:message', { threadId: data.threadId, message });
                    }
                }

                emitBasedOnPermission("manageTickets", "updateUnread")
            }

            response({ type: "success" });
        } catch (e) {
            Logger.error(e);
            response?.({ type: "error", msg: "sendMessage failed" });
        }
    });



    function getMemberForReport(uid) {
        try {
            const m = (serverconfig?.servermembers || {})[uid];
            if (m) return getCastingMemberObject(m);
        } catch { }
        return { id: null, name: null, icon: null };
    }

    /*
    socket.on("reportMessage", async (data, cb) => {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {
            try {
                const me = socket.data.memberId;
                if (!me) return cb?.({ type: "error", msg: "unauthorized" });

                const { messageId, reason = "", plainText = "" } = data || {};
                if (!messageId) return cb?.({ type: "error", msg: "missing messageId" });

                const [msg] = await queryDatabase(
                    `SELECT messageId, threadId, authorId, message, createdAt
                 FROM dms_messages
                 WHERE messageId = ? LIMIT 1`,
                    [messageId]
                );
                if (!msg) return cb?.({ type: "error", msg: "not found" });

                const reporterObj = getMemberForReport(me);
                const reportedObj = getMemberForReport(msg.authorId);

                const reportData = {
                    id: String(msg.authorId),
                    name: reportedObj?.name ?? String(msg.authorId),
                    icon: reportedObj?.icon ?? "/img/default_pfp.png",
                    message: msg.message,
                    plainText: sanitizeInput(plainText),
                    group: "0",
                    category: "0",
                    channel: "0",
                    room: msg.threadId,
                    editedMsgId: null,
                    timestamp: msg.createdAt ? +new Date(msg.createdAt) : Date.now(),
                    messageId: msg.messageId,
                    color: reportedObj?.color ?? null
                };

                await queryDatabase(
                    `INSERT INTO reports (reportCreator, reportedUser, reportType, reportData, reportNotes, reportStatus)
                 VALUES (?, ?, 'dm_message', ?, ?, 'pending')`,
                    [
                        JSON.stringify(reporterObj),
                        JSON.stringify(reportedObj),
                        JSON.stringify(reportData),
                        reason || ""
                    ]
                );

                emitBasedOnPermission("manageReports", "newReport")

                cb?.({ type: "success" });
            } catch (e) {
                Logger.error(e);
                cb?.({ type: "error", msg: "reportMessage failed" });
            }
        }
    }); */

    socket.on('joinTicket', async ({ threadId }, cb) => {
        try {
            const me = socket.data.memberId;
            if (!me) return cb?.({ type: 'error', msg: 'unauthorized' });
            if (!(await isStaff(me))) return cb?.({ type: 'error', msg: 'forbidden' });

            await queryDatabase(
                `INSERT IGNORE INTO dms_participants (threadId, memberId) VALUES (?, ?)`,
                [threadId, me]
            );

            const thread = await buildThreadOut(threadId);
            cb?.({ type: 'success', thread });
        } catch (e) {
            Logger.error(e);
            cb?.({ type: 'error', msg: 'joinTicket failed' });
        }
    });


    socket.on('fetchTickets', async ({ status = 'open', asStaff, id, token }, cb) => {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[id].token == token) {
            try {
                const me = socket.data.memberId;
                if (!me) return cb?.({ type: 'error', msg: 'unauthorized' });

                const wantsStaffView = !!asStaff && (await isStaff(me));

                const baseRows = wantsStaffView
                    ? await queryDatabase(
                        `SELECT t.threadId
                        FROM dms_threads t
                    LEFT JOIN tickets k ON k.threadId = t.threadId
                        WHERE t.type = 'ticket'
                        AND ( ? IS NULL OR k.status = ? )
                    ORDER BY COALESCE(
                    (SELECT MAX(createdAt) FROM dms_messages m WHERE m.threadId = t.threadId),
                    k.createdAt
                    ) DESC`,
                        [status, status]
                    )
                    : await queryDatabase(
                        `SELECT t.threadId
                        FROM dms_threads t
                        JOIN dms_participants p ON p.threadId = t.threadId
                    LEFT JOIN tickets k ON k.threadId = t.threadId
                        WHERE t.type = 'ticket'
                        AND p.memberId = ?
                        AND ( ? IS NULL OR k.status = ? )
                    ORDER BY COALESCE(
                    (SELECT MAX(createdAt) FROM dms_messages m WHERE m.threadId = t.threadId),
                    k.createdAt
                    ) DESC`,
                        [me, status, status]
                    );

                const tickets = [];
                for (const r of baseRows) {
                    const out = await buildThreadOut(r.threadId, me);
                    if (out) tickets.push(out);
                }
                cb?.({ type: 'success', tickets });
            } catch (e) {
                Logger.error(e);
                cb?.({ type: 'error', msg: 'fetchTickets failed' });
            }
        }
    });



    socket.on('joinStaff', async ({ userId, token }, cb) => {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[userId].token == token) {
            try {
                const me = socket.data.memberId;
                if (!me) return cb?.({ type: 'error', msg: 'unauthorized' });
                if (!(await isStaff(me))) return cb?.({ type: 'error', msg: 'forbidden' });

                socket.join('staff');
                cb?.({ type: 'success' });
            } catch (e) {
                Logger.error(e);
                cb?.({ type: 'error', msg: 'joinStaff failed' });
            }
        }
    });


    socket.on("editMessage", async function (data, response) {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {
            try {
                const me = socket.data.memberId;
                let { messageId, payload } = data || {};
                if (!messageId) return response?.({ type: "error", msg: "missing messageId" });
                if (typeof payload.content !== "string") return response?.({ type: "error", msg: "missing content" });
                if(!messageId?.startsWith("m_")) messageId = "m_" + messageId;

                // check if data is set ofc
                if (payload.encrypted === true && !payload.sender) return response?.({ type: "error", msg: "Missing sender while using encryption" });
                if (payload.encrypted === true && !payload.plainSig) return response?.({ type: "error", msg: "Missing plainSig while using encryption" });
                if (payload.encrypted === true && !payload.sig) return response?.({ type: "error", msg: "Missing sig while using encryption" });

                // next we fockin' check if da data is valid, shall we?
                let publicKey = serverconfig.servermembers[me]?.publicKey;
                let isVaildSig = await signer.verifyJson(payload, publicKey);

                // if somehow that silly wanker signed his own message but
                // its wrong he may be using a wrong key and didnt share
                // his new public key. odd innit
                if(!isVaildSig && payload?.sig){
                    return response?.({ type: "error", msg: "Message signature was invalid!" });
                }

                const rows = await queryDatabase(
                    `SELECT authorId, messageId, threadId, message FROM dms_messages WHERE messageId = ? LIMIT 1`,
                    [messageId.startsWith("m_") ? messageId : "m_" + messageId]
                );
                if (!rows.length) return response?.({ type: "error", msg: "not found" });
                const cur = rows[0];

                const [isMember] = await queryDatabase(
                    `SELECT 1 FROM dms_participants WHERE threadId=? AND memberId=? LIMIT 1`,
                    [cur.threadId, me]
                );
                if (!isMember || cur.authorId !== me) return response?.({ type: "error", msg: "forbidden" });

                await queryDatabase(
                    `INSERT INTO dms_message_logs (messageId, threadId, authorId, message, loggedAt) VALUES (?, ?, ?, ?, ?)`,
                    [cur.messageId, cur.threadId, cur.authorId, cur.message, new Date()]
                );

                payload.content = sanitizeInput(payload.content);
                payload.sender = sanitizeInput(payload.sender);
                payload.plainSig = sanitizeInput(payload.plainSig);
                payload.sig = sanitizeInput(payload.sig);
                const encoded = JSON.stringify(payload)

                await queryDatabase(
                    `UPDATE dms_messages SET message = ? WHERE messageId = ?`,
                    [encoded, messageId.startsWith("m_") ? messageId : "m_" + messageId]
                );

                await emitToThread(cur.threadId, "receiveMessageEdit", {
                    threadId: cur.threadId,
                    message: { id: cur.messageId, authorId: cur.authorId, text: payload, ts: new Date() }
                });

                response?.({ type: "success" });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "editMessage failed" });
            }
        }
    });


    socket.on("deleteDMMessage", async function (data, response) {
        if (validateMemberId(socket.data.memberId, socket, data.token) === true) {
            await deleteDMMessage(socket, data, response)
        }
    });

    socket.on("createContent", async function (data, response) {
        try {
            if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {

                if (!await hasPermission(data.id, ["managePosts"])) {
                    response?.({ type: "error", error: "Missing permission: managePosts" });
                    return;
                }

                const type = (data?.type || "").toLowerCase(); // 'posts'|'news'|'help'
                const title = clean(data?.title || "");
                const body = clean(data?.body || "");
                const authorId = data?.authorId;
                const createdAt = nowISO();
                const notifyAll = !!data?.notifyAll;

                if (type === "help") {
                    const slug = (data?.slug ||
                        title.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")).slice(0, 120) || rid("doc");

                    await queryDatabase(
                        `INSERT INTO help (slug, title, body, authorId, createdAt) VALUES (?, ?, ?, ?, ?)`,
                        [slug, title, body, authorId, createdAt]
                    );
                    const [item] = await queryDatabase(
                        `SELECT id, slug, title, body, authorId, createdAt FROM help WHERE slug = ? LIMIT 1`,
                        [slug]
                    );

                    // if notifyAll create content_reads rows for all members (except author)
                    if (notifyAll) {
                        try {
                            const allMemberIds = Object.keys(serverconfig.servermembers || {}).filter(id => String(id) !== String(authorId));
                            const chunkSize = 500;
                            for (let i = 0; i < allMemberIds.length; i += chunkSize) {
                                const chunk = allMemberIds.slice(i, i + chunkSize);
                                const values = chunk.map(() => '(?, ?, ?, NULL)').join(', ');
                                const params = [];
                                for (const uid of chunk) params.push('help', item.id, uid);
                                await queryDatabase(
                                    `INSERT IGNORE INTO content_reads (contentType, contentId, userId, readAt) VALUES ${values}`,
                                    params
                                );
                            }
                        } catch (e) {
                            Logger.error('notifyAll insert failed (help)', e);
                        }
                    }

                    io.emit("receiveContentNew", { type: "help", item: { ...item, notifyAll } });
                    response?.({ type: "success", item });
                    return;
                }

                if (type === "posts") {
                    const tag = clean(data?.tag || "Info");
                    const pinned = !!data?.pinned;
                    const res = await queryDatabase(
                        `INSERT INTO posts (title, body, authorId, tag, pinned, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
                        [title, body, authorId, tag, pinned ? 1 : 0, createdAt]
                    );
                    const item = { id: res.insertId, title, body, authorId, tag, pinned, createdAt };

                    if (notifyAll) {
                        try {
                            const allMemberIds = Object.keys(serverconfig.servermembers || {}).filter(id => String(id) !== String(authorId));
                            const chunkSize = 500;
                            for (let i = 0; i < allMemberIds.length; i += chunkSize) {
                                const chunk = allMemberIds.slice(i, i + chunkSize);
                                const values = chunk.map(() => '(?, ?, ?, NULL)').join(', ');
                                const params = [];
                                for (const uid of chunk) params.push('posts', item.id, uid);
                                await queryDatabase(
                                    `INSERT IGNORE INTO content_reads (contentType, contentId, userId, readAt) VALUES ${values}`,
                                    params
                                );
                            }
                        } catch (e) {
                            Logger.error('notifyAll insert failed (posts)', e);
                        }
                    }

                    io.emit("receiveContentNew", { type: "posts", item: { ...item, notifyAll } });
                    response?.({ type: "success", item });
                    return;
                }

                if (type === "news") {
                    const pinned = !!data?.pinned;
                    const res = await queryDatabase(
                        `INSERT INTO news (title, body, authorId, pinned, createdAt) VALUES (?, ?, ?, ?, ?)`,
                        [title, body, authorId, pinned ? 1 : 0, createdAt]
                    );
                    const item = { id: res.insertId, title, body, authorId, pinned, createdAt };

                    if (notifyAll) {
                        try {
                            const allMemberIds = Object.keys(serverconfig.servermembers || {}).filter(id => String(id) !== String(authorId));
                            const chunkSize = 500;
                            for (let i = 0; i < allMemberIds.length; i += chunkSize) {
                                const chunk = allMemberIds.slice(i, i + chunkSize);
                                const values = chunk.map(() => '(?, ?, ?, NULL)').join(', ');
                                const params = [];
                                for (const uid of chunk) params.push('news', item.id, uid);
                                await queryDatabase(
                                    `INSERT IGNORE INTO content_reads (contentType, contentId, userId, readAt) VALUES ${values}`,
                                    params
                                );
                            }
                        } catch (e) {
                            Logger.error('notifyAll insert failed (news)', e);
                        }
                    }

                    io.emit("receiveContentNew", { type: "news", item: { ...item, notifyAll } });
                    response?.({ type: "success", item });
                    return;
                }

                response?.({ type: "error", msg: "invalid type" });
            }
        } catch (e) {
            Logger.error(e);
            response?.({ type: "error", msg: "createContent failed" });
        }
    });

    socket.on("markContentRead", async function (data, response) {
        try {
            if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {

                const userId = data.id || socket.data.memberId;
                if (!userId) return response?.({ type: "error", msg: "unauthorized" });
                if (String(userId) !== String(socket.data.memberId)) {
                    return response?.({ type: "error", msg: "forbidden" });
                }

                const type = (data.type || "").toLowerCase(); // posts, news, help
                const contentId = Number(data.contentId) || 0;
                if (!contentId || !type) return response?.({ type: "error", msg: "invalid parameters" });

                // read indicator for user
                await queryDatabase(
                    `INSERT INTO content_reads (contentType, contentId, userId, readAt)
                 VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE readAt = VALUES(readAt)`,
                    [type, contentId, userId]
                );

                // compute unreadCount = totalMembers - count(read_rows)
                let totalMembers = Object.keys(serverconfig.servermembers || {}).length;

                const [readRow] = await queryDatabase(
                    `SELECT COUNT(*) AS readCount FROM content_reads WHERE contentType = ? AND contentId = ? AND readAt IS NOT NULL`,
                    [type, contentId]
                );
                const readCount = Number(readRow?.readCount || 0);
                const unreadCount = Math.max(0, totalMembers - readCount);

                io.emit('contentReadUpdate', { type, contentId, unreadCount });

                io.to(data.id).emit('updateUnread');
                response?.({ type: "success", unreadCount });
            }
        } catch (e) {
            Logger.error(e);
            response?.({ type: "error", msg: "markContentRead failed" });
        }
    });


    socket.on("editContent", async function (data, response) {
        const userId = data.id
        if (!userId) {
            response?.({ type: "error", error: "not_authenticated" });
            return;
        }

        if (!validateMemberId(userId, socket) || !(serverconfig.servermembers[userId] && serverconfig.servermembers[userId].token == data.token)) {
            response?.({ type: "error", error: "invalid_member_or_token" });
            return;
        }

        try {
            if (!await hasPermission(userId, ["managePosts"])) {
                response?.({ type: "error", error: "Missing permission: managePosts" });
                return;
            }

            const type = (data?.type || "").toLowerCase();

            if (type === "help") {
                const { idOrSlug, title, body, pinned } = data;
                const idNum = Number(idOrSlug) || 0;
                await queryDatabase(
                    `UPDATE help
                 SET title  = COALESCE(?, title),
                     body   = COALESCE(?, body),
                     pinned = COALESCE(?, pinned)
                 WHERE slug = ? OR id = ?`,
                    [
                        title != null ? clean(title) : null,
                        body != null ? clean(body) : null,
                        pinned != null ? (pinned ? 1 : 0) : null,
                        idOrSlug,
                        idNum
                    ]
                );

                const [item] = await queryDatabase(
                    `SELECT id, slug, title, body, authorId, pinned, createdAt
                 FROM help
                 WHERE slug = ? OR id = ?
                 LIMIT 1`,
                    [idOrSlug, idNum]
                );

                if (!item) {
                    response?.({ type: "error", msg: "help_not_found" });
                    return;
                }

                io.emit("receiveContentUpdate", { type: "help", item });
                response?.({ type: "success", item });
                return;
            }

            if (type === "posts") {
                const { idOrSlug: id, title, body, pinned, tag } = data;
                const idNum = Number(id) || 0;
                await queryDatabase(
                    `UPDATE posts
                 SET title  = COALESCE(?, title),
                     body   = COALESCE(?, body),
                     pinned = COALESCE(?, pinned),
                     tag    = COALESCE(?, tag)
                 WHERE id = ?`,
                    [
                        title != null ? clean(title) : null,
                        body != null ? clean(body) : null,
                        pinned != null ? (pinned ? 1 : 0) : null,
                        tag != null ? clean(tag) : null,
                        idNum
                    ]
                );
                const [item] = await queryDatabase(
                    `SELECT id, title, body, authorId, tag, pinned, createdAt FROM posts WHERE id = ? LIMIT 1`,
                    [idNum]
                );
                if (!item) { response?.({ type: "error", msg: "post_not_found" }); return; }
                io.emit("receiveContentUpdate", { type: "posts", item });
                response?.({ type: "success", item });
                return;
            }

            if (type === "news") {
                const { idOrSlug: id, title, body, pinned } = data;
                const idNum = Number(id) || 0;
                await queryDatabase(
                    `UPDATE news
                 SET title  = COALESCE(?, title),
                     body   = COALESCE(?, body),
                     pinned = COALESCE(?, pinned)
                 WHERE id = ?`,
                    [
                        title != null ? clean(title) : null,
                        body != null ? clean(body) : null,
                        pinned != null ? (pinned ? 1 : 0) : null,
                        idNum
                    ]
                );
                const [item] = await queryDatabase(
                    `SELECT id, title, body, authorId, pinned, createdAt FROM news WHERE id = ? LIMIT 1`,
                    [idNum]
                );
                if (!item) { response?.({ type: "error", msg: "news_not_found" }); return; }
                io.emit("receiveContentUpdate", { type: "news", item });
                response?.({ type: "success", item });
                return;
            }

            response?.({ type: "error", msg: "invalid type" });

        } catch (e) {
            Logger.error(e);
            response?.({ type: "error", msg: "editContent failed" });
        }
    });


    socket.on("deleteContent", async function (data, response) {
        if (validateMemberId(socket.data.memberId, socket) == true && serverconfig.servermembers[data.id].token == data.token) {
            try {

                if (!await hasPermission(data.id, ["managePosts"])) {
                    response?.({ type: "error", error: "Missing permission: managePosts" });
                    return;
                }

                const type = (data?.type || "").toLowerCase();
                const idOrSlug = data?.idOrSlug;

                if (type === "help") {
                    const idNum = Number(idOrSlug) || 0;
                    let resolvedId = idNum;

                    if (!resolvedId) {
                        try {
                            const [row] = await queryDatabase(`SELECT id FROM help WHERE slug = ? LIMIT 1`, [idOrSlug]);
                            resolvedId = Number(row?.id) || 0;
                        } catch (e) {
                            Logger.error('failed to resolve help id for slug', idOrSlug, e);
                        }
                    }

                    // delete help rows
                    await queryDatabase(`DELETE FROM help WHERE slug = ? OR id = ?`, [idOrSlug, Number(idOrSlug) || 0]);

                    // cleanup content_reads
                    if (resolvedId) {
                        await queryDatabase(`DELETE FROM content_reads WHERE contentType = 'help' AND contentId = ?`, [resolvedId]);
                        io.emit('contentReadUpdate', { type: 'help', contentId: resolvedId, unreadCount: 0 });
                    }

                    io.emit("receiveContentDelete", { type: "help", id: idOrSlug });
                    response?.({ type: "success" });
                    return;
                }

                if (type === "posts") {
                    const idNum = Number(idOrSlug) || 0;
                    await queryDatabase(`DELETE FROM posts WHERE id = ?`, [idNum]);

                    if (idNum) {
                        await queryDatabase(`DELETE FROM content_reads WHERE contentType = 'posts' AND contentId = ?`, [idNum]);
                        io.emit('contentReadUpdate', { type: 'posts', contentId: idNum, unreadCount: 0 });
                    }

                    io.emit("receiveContentDelete", { type: "posts", id: idNum });
                    response?.({ type: "success" });
                    return;
                }

                if (type === "news") {
                    const idNum = Number(idOrSlug) || 0;
                    await queryDatabase(`DELETE FROM news WHERE id = ?`, [idNum]);

                    if (idNum) {
                        await queryDatabase(`DELETE FROM content_reads WHERE contentType = 'news' AND contentId = ?`, [idNum]);
                        io.emit('contentReadUpdate', { type: 'news', contentId: idNum, unreadCount: 0 });
                    }

                    io.emit("receiveContentDelete", { type: "news", id: idNum });
                    response?.({ type: "success" });
                    return;
                }


                response?.({ type: "error", msg: "invalid type" });
            } catch (e) {
                Logger.error(e);
                response?.({ type: "error", msg: "deleteContent failed" });
            }
        }
    });
};