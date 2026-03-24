import { test, expect, describe, mock } from "bun:test";
import { defaultTestOverwrites, setupSocketMock } from "../test-client.mjs";

// ok so these mocks seem to be super cool as they can kinda
// overwrite functions and what not so we dont fuck shit up
// which is hella cool
mock.module("../../modules/functions/mysql/mysql.mjs", () => ({
    queryDatabase: mock(async (query, args) => {
        const q = query.toLowerCase();
        
        // return for queries :p
        if (q.includes("insert into") || q.includes("update ") || q.includes("delete from")) {
            return { affectedRows: 1 };
        }
        
        // some selects so we get data
        if (q.includes("select dm_rooms.*")) return [{ roomId: "123456789012", title: "Test Room", createdAt: 123456 }];
        if (q.includes("select roomid, memberid from dm_room_participants")) return [{ roomId: "123456789012", memberId: "user12345678" }];
        
        // fail for new member but work for issuer
        if (q.includes("select id from dm_room_participants")) {
            if (args && args[1] === "user12345678") return [{ id: 1 }]; // Issuer validation
            return []; // target doesnt exist yet
        }

        // some other shit
        if (q.includes("creatorid from dm_rooms")) return [{ roomId: "123456789012", creatorId: "user12345678" }];
        if (q.includes("select message from dms")) return [{ message: JSON.stringify({ data: { roomId: "123456789012", author: { id: "user12345678" } }, meta: {} }) }];
        if (q.includes("select * from dms where messageid = ?")) return [{ message: JSON.stringify({ data: { roomId: "123456789012", author: { id: "user12345678" } }, meta: {} }), editedAt: null }];
        if (q.includes("select * from dm_rooms")) return [{ roomId: "123456789012", title: "Existing Room" }];
        if (q.includes("group by roomid having count")) return []; // No exact matches by default
        
        return [];
    })
}));

mock.module("../../modules/functions/main.mjs", () => ({
    validateMemberId: defaultTestOverwrites.validateMemberId,
    generateId: defaultTestOverwrites.generateId,
    getCastingMemberObject: defaultTestOverwrites.getCastingMemberObject,
    autoAnonymizeMember: mock(),
    autoAnonymizeMessage: mock(),
    removeFromArray: defaultTestOverwrites.removeFromArray
}));

// mock some important shit from the index. i love this shit so much
mock.module("../../index.mjs", () => ({
    serverconfig: {
        serverinfo: { dms: { maxParticipants: 10 } },
        servermembers: {
            "user12345678": {
                id: "user12345678",
                token: "test"
            }
        }
    },
    io: defaultTestOverwrites.io,
    signer: {},
    usersocket: {},
    xssFilters: {}
}));

mock.module("../../modules/sockets/resolveMessage.mjs", () => ({
    processMessageObject: mock(async (msg) => ({ author: { id: "user12345678" } })),
    checkMessageObjAuthor: mock()
}));


// Import the handler AFTER mocks
import dmsRoomHandler from "../../modules/sockets/home/dms/rooms.mjs";

describe("DM System", () => {
    const env = setupSocketMock(dmsRoomHandler);

    test("Server connection", () => {
        expect(env.clientSocket.connected).toBeTrue();
    });

    test("Create DM Room", async () => {
        const payload = { 
            id: "user12345678", 
            token: "test",
            participants: ["friend123456"]
        };
        const res = await new Promise(resolve => env.clientSocket.emit("createDmRoom", payload, resolve));
        
        expect(res.error).toBeNull();
        expect(res.roomId).toBe("123456789012");
    });

    test("Get DM Rooms", async () => {
        const payload = { id: "user12345678",token: "test", };
        const res = await new Promise(resolve => env.clientSocket.emit("getDmRooms", payload, resolve));
        
        expect(res.error).toBeNull();
        expect(res.rooms).toBeArray();
        expect(res.rooms.length).toBeGreaterThan(0);
        expect(res.rooms[0].roomId).toBe("123456789012");
    });
    
    test("Join DM Room", async () => {
        const payload = { 
            id: "user12345678",
            token: "test",
            roomId: "123456789012" 
        };
        const res = await new Promise(resolve => env.clientSocket.emit("joinDmRoom", payload, resolve));
        
        expect(res.error).toBeNull();
    });

    test("Send DM Message", async () => {
        const payload = {
            id: "user12345678",
            token: "test",
            payload: {
                data: {
                    roomId: "123456789012",
                    author: { id: "user12345678" },
                    message: "Hello world"
                }
            }
        };

        const res = await new Promise(resolve => env.clientSocket.emit("sendDmMessage", payload, resolve));
        
        expect(res.error).toBeNull();
        expect(res.payload).toBeDefined();
    });

    test("Add DM Room Participant", async () => {
        const payload = { 
            id: "user12345678",
            token: "test",
            roomId: "123456789012", 
            memberId: "newusr123456" 
        };
        const res = await new Promise(resolve => env.clientSocket.emit("addDmRoomParticipant", payload, resolve));
        
        expect(res.error).toBeNull();
    });

    test("Remove DM Room Participant", async () => {
        const payload = { 
            id: "user12345678",
            token: "test",
            roomId: "123456789012", 
            memberId: "newusr123456" 
        };
        const res = await new Promise(resolve => env.clientSocket.emit("removeDmRoomParticipant", payload, resolve));
        
        expect(res.error).toBeNull();
    });

    test("Delete DM Room", async () => {
        const payload = { 
            id: "user12345678",
            token: "test",
            roomId: "123456789012" 
        };
        const res = await new Promise(resolve => env.clientSocket.emit("deleteDmRoom", payload, resolve));
        
        expect(res.error).toBeNull();
    });
});
