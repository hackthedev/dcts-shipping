import {queryDatabase} from "../../../functions/mysql/mysql.mjs";
import {generateId, getCastingMemberObject, removeFromArray, validateMemberId} from "../../../functions/main.mjs";
import {serverconfig} from "../../../../index.mjs";
import Logger from "@hackthedev/terminal-logger";

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
    let resolvedRoomParticipants = {};
    for(let i = 0; i < roomsRow.length; i++) {
        let room = roomsRow[i];

        let roomParticipants = room.participants.split(",");
        if(roomParticipants?.length > 0){
            for(let participant of roomParticipants){
                let memberObj = resolvedRoomParticipants[participant] ?? await getCastingMemberObject(serverconfig.servermembers[participant])
                if(memberObj) resolvedRoomParticipants[participant] = memberObj;
            }
        }

        room.participants = resolvedRoomParticipants;
    }

    return roomsRow;
}

export async function createMemberDmRoom(memberId, participants) {
    if(!memberId) throw new Error("Member Id is required");
    if(!Array.isArray(participants)) throw new Error("Participants must be an array");

    // used later for chat room title
    let title = "";

    // lets add us aka the creator first for the title
    if(!participants[memberId]) participants.push(memberId);

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

    console.log([String(generateId(12)), participantsString, title, memberId]);

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