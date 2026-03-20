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

export async function getMemberDmRooms(memberId) {
    if(!memberId) throw new Error("Member Id is required");

    const roomsRow = await queryDatabase(
        `SELECT * FROM dm_rooms WHERE FIND_IN_SET(?, participants) ORDER BY createdAt DESC LIMIT 50`,
        [String(memberId)]
    );


    if(roomsRow?.length === 0) return null;

    // basically what we're doing here is looking through all rooms found
    // and resolve the member objects using the id stuff and later overwrite it.
    // why? because this is actually A LOT faster than having the client resolve it for each member.
    //
    let resolvedRoomParticipants = {}; // cache

    for(let i = 0; i < roomsRow.length; i++) {
        let room = roomsRow[i];
        let roomSpecificParticipants = {};

        // for each room participant we will look up the member obj
        let roomParticipants = room.participants.split(",");
        if(roomParticipants?.length > 0){
            for(let participant of roomParticipants){
                let memberObj;

                // if the same member has been resolved before we can use it again
                // as some sort of cache and will prevent fetching data from the
                // database again.
                if(resolvedRoomParticipants[participant]){
                    memberObj = resolvedRoomParticipants[participant];
                }
                // if the member was not found in resolvedRoomParticipants, we will have
                // to fetch it anyway. after that tho we will store it for possible reuse.
                else{
                    memberObj = await getCastingMemberObject(serverconfig.servermembers[participant])
                    if(memberObj) resolvedRoomParticipants[participant] = memberObj;
                }

                if(memberObj) roomSpecificParticipants[participant] = memberObj;
            }
        }

        room.participants = roomSpecificParticipants;
    }

    return roomsRow;
}

function isValidTimestamp(ts) {
    if (typeof ts !== "number") return false;
    if (!Number.isFinite(ts)) return false;
    return !isNaN(new Date(ts).getTime());
}

export async function saveRoomDmMessage(payload){
    if(!payload) throw new Error("missing message")
    if(!payload?.data?.roomId) throw new Error("missing roomid")
    if(!payload?.data?.author?.id) throw new Error("missing author id")
    if(typeof payload !== "object") throw new Error("Payload is not an object");

    let authorId = payload?.data?.author?.id;
    let roomId = payload?.data?.roomId;

    // we ONLY wanna store the id as reference and not possible the entire author object on accident
    if(authorId) payload.data.author = {id: authorId};

    // we CANT edit the data itself as its signed, so
    // we will create a meta object within it
    let messageId = generateId(12);
    payload.meta = {
        messageId,
        timestamp: new Date().getTime()
    }

    return await queryDatabase(
        `INSERT INTO dms (authorId, roomId, messageId, message, createdAt) VALUES (?,?,?,?,?)`,
        [
            authorId,
            roomId,
            messageId,
            JSON.stringify(payload),
            payload.meta.timestamp
        ]
    )
}

export async function getDmRoomMessages(roomId, requesterMemberId, timestamp = null){
    if(!roomId) throw new Error("missing roomid")
    if(!requesterMemberId) throw new Error("missing requesterMemberId")
    /*
        requesterMemberId needs to be passed and is the id of
        the member that tries to fetch the dm messages. Very important!
     */

    let messageRows;

    if(!timestamp){
        messageRows = await queryDatabase(
            `SELECT dms.*
             FROM dms
                      INNER JOIN dm_rooms ON dm_rooms.roomId = dms.roomId
             WHERE dms.roomId = ?
               AND FIND_IN_SET(?, dm_rooms.participants)
             ORDER BY dms.createdAt DESC
                 LIMIT 50`,
            [roomId, requesterMemberId]
        );
    }
    else{
        messageRows = await queryDatabase(
            `SELECT dms.*
             FROM dms
                      INNER JOIN dm_rooms ON dm_rooms.roomId = dms.roomId
             WHERE dms.roomId = ?
               AND FIND_IN_SET(?, dm_rooms.participants)
               AND dms.createdAt <= ?
             ORDER BY dms.createdAt DESC
                 LIMIT 50`,
            [roomId, requesterMemberId, timestamp]
        );
    }

    if(messageRows?.length === 0) return null;

    let messages = {}
    for(let i = 0; i < messageRows.length; i++){
        let messageRow = messageRows[i];
        let message = JSONTools.tryParse(messageRow.message);

        // only store specific stuff in the meta obj
        let resolvedMessageObj = await processMessageObject(message.data, requesterMemberId);
        message.meta.author = resolvedMessageObj?.author ?? {id: 0};
        message.meta.reply = resolvedMessageObj?.reply ?? {id: null};

        messages[messageRow.messageId] = message;
    }

    return messages;
}

export async function createMemberDmRoom(memberId, participants) {
    if(!memberId) throw new Error("Member Id is required");
    if(!Array.isArray(participants)) throw new Error("Participants must be an array");

    // used later for chat room title
    let title = "";

    // lets add us aka the creator first for the title
    if(!participants.includes(memberId)) participants.push(memberId);

    // lets validate members for the room here
    for(let i = 0; i < participants.length; i++) {
        let participant = participants[i];

        // remove invalid member ids
        if(participant?.length !== 12) removeFromArray(participants, participant);

        // we're gonna build the chat title here with the member names.
        if(i < 3){
            let member = await getCastingMemberObject(serverconfig.servermembers[participant]);
            title += i === 0 ? `${member?.name}` : `,${member?.name}`;
        }
        // and if there are more participants we will just
        // add a ... there
        if(i === 3 && participants.length > 3){
            title += ",...";
        }
    }

    // get rid of possible duplicates and then make sure the member
    // that is actually creating the room is also a participant lol
    participants = [...new Set(participants.map(String))];

    // make the sql string.. id1,id2,id3,...
    let participantsString = participants.join(",");

    return await queryDatabase(
        `INSERT INTO dm_rooms (roomId, participants, title, creatorId) VALUES (?, ?, ?, ?)`,
        [String(generateId(12)), participantsString, title, memberId]
    );
}


export default (io) => (socket) => {
    socket.on('getDmRooms', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({type: 'error', msg: 'unauthorized'});
        }

        response({ error: null, rooms: await getMemberDmRooms(member.id)});
    });

    socket.on('getDmRoomMessages', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({type: 'error', msg: 'unauthorized'});
        }

        if(member?.roomId === undefined) return response({ error: "roomId missing"})
        if(member?.roomId?.length !== 12) return response({ error: "Invalid roomId format"})

        response({ error: null, messages: await getDmRoomMessages(member.roomId, member.id)});
    });

    socket.on('joinDmRoom', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({type: 'error', msg: 'unauthorized'});
        }

        if(member?.roomId === undefined) return response({ error: "roomId missing"});
        if(!socket.rooms.has(member.roomId)){
            socket.join(member.roomId);
        }

        response({error: null})
    });


    socket.on('sendDmMessage', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({type: 'error', msg: 'unauthorized'});
        }

        let payload = member?.payload
        if(typeof payload !== "object") return response({ error: "Missing message payload"})
        console.log(payload)

        if(payload?.data?.roomId === undefined) return response({ error: "roomId missing"})
        if(payload?.data?.roomId?.length !== 12) return response({ error: "Invalid roomId format"})
        if(!payload?.data) return response({ error: "Missing data object"})
        if(typeof payload?.data !== "object") return response({ error: "Message is not an object"})
        if(!payload?.data?.author?.id) return response({ error: "Message doesnt contain author information"})

        let result = await saveRoomDmMessage(payload);
        let hasError = result?.affectedRows > 0 ? null : "Error while sending DM"

        if(!hasError){
            io.in(member.message.roomId).emit("newDmMessage", { message });
        }

        response({ error: hasError, message});
    });


    socket.on('createDmRoom', async function (member, response) {
        if (await validateMemberId(member.id, socket, member?.token) !== true) {
            return response?.({type: 'error', msg: 'unauthorized'});
        }

        if(member?.participants === undefined) return response({ error: "participants array missing"})
        if(!Array.isArray(member.participants)) return response({ error: "participants must be an array"})

        try{
            let room = await createMemberDmRoom(member.id, member?.participants);
            response({ error: room?.affectedRows > 0 ? null : "Error while creating room"});
        }
        catch(ex){
            Logger.error(ex);
            response({ error: "Unable to create dm room :/"});
        }
    });
};