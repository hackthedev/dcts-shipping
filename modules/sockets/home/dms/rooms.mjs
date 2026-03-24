import {queryDatabase} from "../../../functions/mysql/mysql.mjs";
import {
    autoAnonymizeMember,
    autoAnonymizeMessage,
    generateId,
    getCastingMemberObject,
    removeFromArray,
    validateMemberId
} from "../../../functions/main.mjs";
import {serverconfig} from "../../../../index.mjs";
import Logger from "@hackthedev/terminal-logger";
import JSONTools from "@hackthedev/json-tools";
import {checkMessageObjAuthor, processMessageObject} from "../../resolveMessage.mjs";
import {io} from "../../../../index.mjs";
import {hasPermission} from "../../../functions/chat/main.mjs";

export async function getMemberDmRooms(memberId) {
    if (!memberId) throw new Error("Member Id is required");

    const roomsRow = await queryDatabase(
        `SELECT dm_rooms.*
         FROM dm_rooms
                  INNER JOIN dm_room_participants ON dm_room_participants.roomId = dm_rooms.roomId
         WHERE dm_room_participants.memberId = ?
         ORDER BY dm_rooms.createdAt DESC LIMIT 50`,
        [String(memberId)]
    );

    if (roomsRow?.length === 0) return null;

    const roomIds = roomsRow.map(room => room.roomId);
    if (roomIds.length === 0) return null;

    const participantRows = await queryDatabase(
        `SELECT roomId, memberId
         FROM dm_room_participants
         WHERE roomId IN (${roomIds.map(() => "?").join(",")})`,
        roomIds
    );

    // basically what we're doing here is looking through all rooms found
    // and resolve the member objects using the id stuff and later overwrite it.
    // why? because this is actually A LOT faster than having the client resolve it for each member.
    //
    let resolvedRoomParticipants = {}; // cache
    let roomParticipantsMap = {};

    for (let i = 0; i < participantRows.length; i++) {
        let row = participantRows[i];
        if (!roomParticipantsMap[row.roomId]) roomParticipantsMap[row.roomId] = [];
        roomParticipantsMap[row.roomId].push(String(row.memberId));
    }

    for (let i = 0; i < roomsRow.length; i++) {
        let room = roomsRow[i];
        let roomSpecificParticipants = {};

        // for each room participant we will look up the member obj
        let roomParticipants = roomParticipantsMap[room.roomId] || [];
        if (roomParticipants?.length > 0) {
            for (let participant of roomParticipants) {
                let memberObj;

                // if the same member has been resolved before we can use it again
                // as some sort of cache and will prevent fetching data from the
                // database again.
                if (resolvedRoomParticipants[participant]) {
                    memberObj = resolvedRoomParticipants[participant];
                }
                    // if the member was not found in resolvedRoomParticipants, we will have
                // to fetch it anyway. after that tho we will store it for possible reuse.
                else {
                    memberObj = await getCastingMemberObject(serverconfig.servermembers[participant])
                    if (memberObj) resolvedRoomParticipants[participant] = memberObj;
                }

                if (memberObj) roomSpecificParticipants[participant] = memberObj;
            }
        }

        room.participants = roomSpecificParticipants;
    }

    return roomsRow;
}

export async function getUnreadDms(id) {
    // try members first cauz lazy
    let rows = await queryDatabase(
        `SELECT d.roomId, COUNT(*) AS unread
         FROM dms d
                  INNER JOIN dm_room_participants p ON p.roomId = d.roomId AND p.memberId = ?
                  LEFT JOIN dm_reads r ON r.targetId = d.roomId AND r.memberId = ?
         WHERE d.authorId != ?
         AND d.createdAt > COALESCE(r.lastReadAt, 0)
         GROUP BY d.roomId`,
        [id, id, id]
    );

    // if no member found try room
    if (!rows?.length) {
        rows = await queryDatabase(
            `SELECT d.roomId, COUNT(*) AS unread
             FROM dms d
             LEFT JOIN dm_reads r ON r.targetId = d.roomId AND r.memberId = d.authorId
             WHERE d.roomId = ?
             AND d.createdAt > COALESCE(r.lastReadAt, 0)
             GROUP BY d.roomId`,
            [id]
        );
    }

    let result = {};
    for (let row of rows) result[row.roomId] = row.unread;
    return result;
}

export async function getDmUnreadChannel(memberId, channelId) {
    let rows = await queryDatabase(
        `SELECT COUNT(*) AS unread
         FROM messages m
         LEFT JOIN dm_reads r ON r.targetId = m.room AND r.memberId = ?
         WHERE m.room = ? AND m.authorId != ?
         AND m.createdAt > COALESCE(r.lastReadAt, 0)`,
        [memberId, channelId, memberId]
    );
    return Number(rows?.[0]?.unread || 0);
}

export async function markDmAsRead(memberId, messageId = null, roomId = null) {
    let targetId, timestamp;

    if (messageId) {
        let rows = await queryDatabase(
            `SELECT roomId, createdAt FROM dms WHERE messageId = ?`,
            [messageId]
        );
        if (!rows?.length) return null;
        targetId = rows[0].roomId;
        timestamp = rows[0].createdAt;
    } else if (roomId) {
        targetId = roomId;
        timestamp = new Date().getTime();
    } else {
        return null;
    }

    await queryDatabase(
        `INSERT INTO dm_reads (memberId, targetId, lastReadAt)
         VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE lastReadAt = GREATEST(lastReadAt, ?)`,
        [memberId, targetId, timestamp, timestamp]
    );
}

export async function fetchDmMessageById(id, issuerId, noLoop = false) {
    if (!id || id?.length !== 12) throw new Error("Missing ID or invalid");
    if (!issuerId || issuerId?.length !== 12) throw new Error("Missing issuerId or invalid");

    let messageRow = await queryDatabase(
        `SELECT * FROM dms WHERE messageId = ?`,
        [id]
    );

    if (messageRow?.length === 0) return null;

    let parsed = JSONTools.tryParse(messageRow[0].message);
    if (!parsed) return null;

    let resolvedMessageObj = await processMessageObject(parsed.data, issuerId);
    parsed.meta = parsed.meta || {};
    parsed.meta.author = resolvedMessageObj?.author ?? {id: 0};

    // get reply stuff
    if(parsed?.data?.reply?.messageId?.length === 12 && !noLoop){
        let resolvedReply = await fetchDmMessageById(parsed.data.reply.messageId, issuerId, true);
        if(resolvedReply) parsed.meta.reply = resolvedReply;
    }

    parsed.meta.editedAt = messageRow[0].editedAt ?? null;

    return parsed;
}

export async function deleteDmRoom(roomId, issuerId) {
    if (!roomId || roomId?.length !== 12) throw new Error("Missing ID or invalid");
    if (!issuerId || issuerId?.length !== 12) throw new Error("Missing issuerId or invalid");

    let roomRow = await queryDatabase(
        `SELECT roomId, creatorId FROM dm_rooms WHERE creatorId = ?`,
        [issuerId]
    )

    if(roomRow?.length === 0) {
        return {
            error: "Room not found"
        }
    }

    let deleteResult = null;
    if(roomRow[0]?.creatorId === issuerId && roomRow[0]?.roomId){
        deleteResult = await queryDatabase(
            `DELETE FROM dm_rooms WHERE roomId = ?`,
            [roomRow[0]?.roomId]
        )
    }
    else{
        return {
            error: "Unauthorized",
            result: deleteResult
        }
    }

    return {
        error: null,
        result: deleteResult
    };
}


export async function saveRoomDmMessage(payload) {
    if (!payload) throw new Error("missing message")
    if (!payload?.data?.roomId) throw new Error("missing roomid")
    if (!payload?.data?.author?.id) throw new Error("missing author id")
    if (typeof payload !== "object") throw new Error("Payload is not an object");

    let authorId = payload?.data?.author?.id;
    let roomId = payload?.data?.roomId;

    // we ONLY wanna store the id as reference and not possible the entire author object on accident
    if (authorId) payload.data.author = {id: authorId};

    // we CANT edit the data itself as its signed, so
    // we will create a meta object within it

    // if edited, update
    if (payload?.messageEditId?.length === 12) {
        let editedAt = new Date().getTime();

        let rows = await queryDatabase(
            `SELECT message FROM dms WHERE messageId = ?`,
            [payload.messageEditId]
        );

        if (!rows?.length) return null;

        let original = JSONTools.tryParse(rows[0].message);
        if (!original) return null;

        original.data = payload.data;
        original.meta.editedAt = editedAt;
        original.meta.messageEditId = payload.messageEditId;

        await queryDatabase(
            `UPDATE dms SET message = ?, editedAt = ? WHERE messageId = ?`,
            [JSON.stringify(original), editedAt, payload.messageEditId]
        );

        return original;
    } else {
        let messageId = generateId(12);
        payload.meta = {
            messageId,
            timestamp: new Date().getTime()
        }

        await queryDatabase(
            `INSERT INTO dms (authorId, roomId, messageId, message, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
                authorId,
                roomId,
                messageId,
                JSON.stringify(payload),
                payload.meta.timestamp
            ]
        )

        return payload;
    }
}

export async function getDmRoomMessages(roomId, requesterMemberId, timestamp = null) {
    if (!roomId) throw new Error("missing roomid")
    if (!requesterMemberId) throw new Error("missing requesterMemberId")
    /*
        requesterMemberId needs to be passed and is the id of
        the member that tries to fetch the dm messages. Very important!
     */

    let messageRows;

    if (!timestamp) {
        messageRows = await queryDatabase(
            `SELECT dms.*
             FROM dms
                      INNER JOIN dm_room_participants ON dm_room_participants.roomId = dms.roomId
             WHERE dms.roomId = ?
               AND dm_room_participants.memberId = ?
             ORDER BY dms.createdAt DESC LIMIT 50`,
            [roomId, requesterMemberId]
        );
    } else {
        messageRows = await queryDatabase(
            `SELECT dms.*
             FROM dms
                      INNER JOIN dm_room_participants ON dm_room_participants.roomId = dms.roomId
             WHERE dms.roomId = ?
               AND dm_room_participants.memberId = ?
               AND dms.createdAt <= ?
             ORDER BY dms.createdAt DESC LIMIT 50`,
            [roomId, requesterMemberId, timestamp]
        );
    }

    if (messageRows?.length === 0) return null;

    let messages = {}
    for (let i = 0; i < messageRows.length; i++) {
        let messageRow = messageRows[i];
        let message = JSONTools.tryParse(messageRow.message);

        // only store specific stuff in the meta obj
        let resolvedMessageObj = await processMessageObject(message.data, requesterMemberId);
        message.meta.author = resolvedMessageObj?.author ?? {id: 0};
        message.meta.editedAt = message.meta.editedAt = messageRow.editedAt ?? null;

        // resolve replies
        if(message?.data?.reply?.messageId?.length === 12){
            let replyId = message?.data?.reply?.messageId
            let resolvedReply = await fetchDmMessageById(replyId, requesterMemberId);
            if(resolvedReply) message.meta.reply = resolvedReply ?? {messageId: replyId}
        }

        messages[messageRow.messageId] = message;
    }

    return messages;
}

export async function addDmRoomParticipant(roomId, memberId, issuerId) {
    if (!roomId || roomId.length !== 12) throw new Error("invalid roomId");
    if (!memberId || memberId.length !== 12) throw new Error("invalid memberId");
    if (!issuerId || issuerId.length !== 12) throw new Error("invalid issuerId");

    let issuerCheck = await queryDatabase(
        `SELECT id FROM dm_room_participants WHERE roomId = ? AND memberId = ?`,
        [roomId, issuerId]
    );
    if (!issuerCheck?.length) return { error: "unauthorized" };

    let existing = await queryDatabase(
        `SELECT id FROM dm_room_participants WHERE roomId = ? AND memberId = ?`,
        [roomId, memberId]
    );
    if (existing?.length) return { error: "already in room" };

    let result = await queryDatabase(
        `INSERT INTO dm_room_participants (roomId, memberId) VALUES (?, ?)`,
        [roomId, memberId]
    );

    return { error: result?.affectedRows > 0 ? null : "failed to add participant" };
}

export async function removeDmRoomParticipant(roomId, memberId, issuerId) {
    if (!roomId || roomId.length !== 12) throw new Error("invalid roomId");
    if (!memberId || memberId.length !== 12) throw new Error("invalid memberId");
    if (!issuerId || issuerId.length !== 12) throw new Error("invalid issuerId");

    let room = await queryDatabase(
        `SELECT creatorId FROM dm_rooms WHERE roomId = ?`,
        [roomId]
    );
    if (!room?.length) return { error: "room not found" };

    if (memberId !== issuerId && room[0].creatorId !== issuerId) {
        return { error: "unauthorized" };
    }

    let result = await queryDatabase(
        `DELETE FROM dm_room_participants WHERE roomId = ? AND memberId = ?`,
        [roomId, memberId]
    );

    if (!result?.affectedRows) return { error: "not in room" };

    let remaining = await queryDatabase(
        `SELECT id FROM dm_room_participants WHERE roomId = ? LIMIT 1`,
        [roomId]
    );

    if (!remaining?.length) {
        await queryDatabase(`DELETE FROM dm_rooms WHERE roomId = ?`, [roomId]);
        return { error: null, roomDeleted: true };
    }

    return { error: null, roomDeleted: false };
}

export async function createMemberDmRoom(memberId, participants) {
    if (!memberId) throw new Error("Member Id is required");
    if (!Array.isArray(participants)) throw new Error("Participants must be an array");

    // used later for chat room title
    let title = "";

    // lets add us aka the creator first for the title
    if (!participants.includes(memberId)) participants.push(memberId);

    // get rid of possible duplicates and then make sure the member
    // that is actually creating the room is also a participant lol
    participants = [...new Set(participants.map(String))];

    // check for existing room obviously, would become chaotic otherwise
    let existingRoom = await findExactDmRoom(participants);
    if (existingRoom) return {result: {affectedRows: 1}, roomId: existingRoom.roomId};

    // only valid participants
    participants = participants.filter(p => p?.length === 12 || p === "system");

    for (let i = 0; i < participants.length; i++) {
        let participant = participants[i];

        // we're gonna build the chat title here with the member names.
        if (i < 3) {
            let member = await getCastingMemberObject(serverconfig.servermembers[participant]);
            title += i === 0 ? `${member?.name}` : `,${member?.name}`;
        }
        // and if there are more participants we will just
        // add a ... there
        if (i === 3 && participants.length > 3) {
            title += ", ...";
        }
    }

    if (participants.length < 1) {
        return {result: {affectedRows: 0}, roomId: null};
    }

    let roomId = String(generateId(12));
    let result = await queryDatabase(
        `INSERT INTO dm_rooms (roomId, title, creatorId)
         VALUES (?, ?, ?)`,
        [roomId, title, memberId]
    );

    if (result?.affectedRows > 0 && participants.length > 0) {
        let values = [];
        let placeholders = [];

        for (let participant of participants) {
            placeholders.push("(?, ?)");
            values.push(roomId, participant);
        }

        await queryDatabase(
            `INSERT INTO dm_room_participants (roomId, memberId)
             VALUES ${placeholders.join(",")}`,
            values
        );
    }

    participants.forEach((participant) => {
        io.in(participant).emit("roomInvitation", {roomId});
    })

    return {result, roomId};
}

async function findExactDmRoom(participants) {
    if (!participants?.length) return null;

    let rows = await queryDatabase(
        `SELECT roomId
         FROM dm_room_participants
         WHERE memberId IN (${participants.map(() => "?").join(",")})
         GROUP BY roomId
         HAVING COUNT(DISTINCT memberId) = ?`,
        [...participants, participants.length]
    );

    if (!rows?.length) return null;

    let candidateRoomIds = rows.map(row => row.roomId);
    let participantRows = await queryDatabase(
        `SELECT roomId, memberId
         FROM dm_room_participants
         WHERE roomId IN (${candidateRoomIds.map(() => "?").join(",")})`,
        candidateRoomIds
    );

    let sorted = participants.slice().sort().join(",");
    let roomParticipantsMap = {};

    // then we need to check for participants if we find something
    for (let row of participantRows) {
        if (!roomParticipantsMap[row.roomId]) roomParticipantsMap[row.roomId] = [];
        roomParticipantsMap[row.roomId].push(String(row.memberId));
    }

    for (let roomId of candidateRoomIds) {
        let rowParticipants = (roomParticipantsMap[roomId] || []).sort().join(",");
        if (rowParticipants === sorted) {
            let roomRows = await queryDatabase(
                `SELECT *
                 FROM dm_rooms
                 WHERE roomId = ? LIMIT 1`,
                [roomId]
            );
            if (roomRows?.[0]) return roomRows[0];
        }
    }

    return null;
}

export default (io) => (socket) => {
    socket.on('getDmRooms', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        response({error: null, rooms: await getMemberDmRooms(member.id)});
    });

    socket.on('getDmRoomMessages', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (member?.roomId === undefined) return response({error: "roomId missing"})
        if (member?.roomId?.length !== 12) return response({error: "Invalid roomId format"})

        response({error: null, messages: await getDmRoomMessages(member.roomId, member.id)});
    });

    socket.on('joinDmRoom', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (member?.roomId === undefined) return response({error: "roomId missing"});
        if (!socket.rooms.has(member.roomId)) {
            socket.join(member.roomId);
        }

        response({error: null})
    });

    socket.on('addDmRoomParticipant', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (!member?.roomId || member.roomId.length !== 12) return response({error: "invalid roomId"});
        if (!member?.memberId || member.memberId.length !== 12) return response({error: "invalid memberId"});

        let {error} = await addDmRoomParticipant(member.roomId, member.memberId, member.id);
        if (error) return response({error});

        io.in(member.roomId).emit("dmParticipantAdded", {roomId: member.roomId, memberId: member.memberId});
        io.in(member.memberId).emit("roomInvitation", {roomId: member.roomId});

        response({error: null});
    });

    socket.on('removeDmRoomParticipant', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (!member?.roomId || member.roomId.length !== 12) return response({error: "invalid roomId"});
        if (!member?.memberId || member.memberId.length !== 12) return response({error: "invalid memberId"});

        let {error, roomDeleted} = await removeDmRoomParticipant(member.roomId, member.memberId, member.id);
        if (error) return response({error});

        if (roomDeleted) {
            io.in(member.roomId).emit("roomDeleted", {roomId: member.roomId});
        } else {
            io.in(member.roomId).emit("dmParticipantRemoved", {roomId: member.roomId, memberId: member.memberId});
        }

        response({error: null});
    });

    socket.on('deleteDmRoom', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (member?.roomId === undefined) return response({error: "roomId missing"});
        let {result, error} = await deleteDmRoom(member.roomId, member.id);

        if(result?.affectedRows > 0){
            if(result?.affectedRows > 0){
                io.in(member.roomId).emit("roomDeleted", {roomId: member.roomId, error: null});
                response({error: null});
            }
        }
        else{
            response({error: `Unable to delete DM: ${error}`})
        }
    });

    socket.on('sendDmMessage', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        let payload = member?.payload
        if (typeof payload !== "object") return response({error: "Missing message payload"})

        if (payload?.data?.roomId === undefined) return response({error: "roomId missing"})
        if (payload?.data?.roomId?.length !== 12) return response({error: "Invalid roomId format"})
        if (!payload?.data) return response({error: "Missing data object"})
        if (typeof payload?.data !== "object") return response({error: "Message is not an object"})
        if (!payload?.data?.author?.id) return response({error: "Message doesnt contain author information"})

        let saved = await saveRoomDmMessage(payload);
        let hasError = saved ? null : "Error while sending DM";

        if (!hasError) {
            let fullMessage = await fetchDmMessageById(
                saved.meta.messageId,
                member.id
            );

            if (saved.meta.messageEditId) {
                fullMessage.messageEditId = saved.meta.messageEditId;
            }

            io.in(fullMessage.data.roomId).emit("newDmMessage", { payload: fullMessage });
            response({ error: null, payload: fullMessage });
        } else {
            response({ error: hasError, payload: null });
        }
    });

    socket.on('createDmRoom', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        if (member?.participants === undefined) return response({error: "participants array missing"})
        if (!Array.isArray(member.participants)) return response({error: "participants must be an array"})

        if (member?.participants?.length > 10) {
            return response({error: `You can only add up to ${serverconfig.serverinfo.dms.maxParticipants} participants}`})
        }

        try {
            let {result, roomId} = await createMemberDmRoom(member.id, member?.participants);
            let error = result?.affectedRows > 0 ? null : "Error while creating room"

            response({error, roomId});
        } catch (ex) {
            Logger.error(ex);
            response({error: "Unable to create dm room :/"});
        }
    });

    socket.on('markDmAsRead', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({error: 'unauthorized'});
        }

        let mid = member?.messageId;
        let rid = member?.roomId;

        if (!mid && !rid) return response?.({error: "messageId or roomId required"});
        if (mid && mid.length !== 12) return response?.({error: "invalid messageId"});
        if (rid && rid.length !== 12) return response?.({error: "invalid roomId"});

        await markDmAsRead(member.id, mid || null, rid || null);
        response?.({error: null});
    });
};