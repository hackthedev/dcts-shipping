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
        if (q.includes("select roomid, memberid from dm_room_participants")) return [{ roomId: "123456789012", memberid: "123456789012" }];

        // fail for new member but work for issuer
        if (q.includes("select id from dm_room_participants")) {
            if (args && args[1] === "123456789012") return [{ id: 1 }]; // Issuer validation
            return []; // target doesnt exist yet
        }

        // some other shit
        if (q.includes("creatorid from dm_rooms")) return [{ roomId: "123456789012", creatorId: "123456789012" }];
        if (q.includes("select message from dms")) return [{ message: JSON.stringify({ data: { roomId: "123456789012", author: { id: "123456789012" } }, meta: {} }) }];
        if (q.includes("select * from dms where messageid = ?")) return [{ message: JSON.stringify({ data: { roomId: "123456789012", author: { id: "123456789012" } }, meta: {} }), editedAt: null }];
        if (q.includes("select * from dm_rooms")) return [{ roomId: "123456789012", title: "Existing Room" }];
        if (q.includes("group by roomid having count")) return []; // No exact matches by default

        return [];
    })
}));

// mock some important shit from the index. i love this shit so much

mock.module("../../modules/sockets/resolveMessage.mjs", () => ({
    processMessageObject: mock(async (msg) => ({ author: { id: "123456789012" } })),
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
            id: "123456789012",
            token: "test",
            participants: ["123456789013"]
        };
        const res = await new Promise(resolve => env.clientSocket.emit("createDmRoom", payload, resolve));

        expect(res.error).toBeNull();
        expect(res.roomId).toBe("123456789012");
    });

    test("Get DM Rooms", async () => {
        const payload = { id: "123456789012", token: "test", };
        const res = await new Promise(resolve => env.clientSocket.emit("getDmRooms", payload, resolve));

        expect(res.error).toBeNull();
        expect(res.rooms).toBeArray();
        expect(res.rooms.length).toBeGreaterThan(0);
        expect(res.rooms[0].roomId).toBe("123456789012");
    });

    test("Join DM Room", async () => {
        const payload = {
            id: "123456789012",
            token: "test",
            roomId: "123456789012"
        };
        const res = await new Promise(resolve => env.clientSocket.emit("joinDmRoom", payload, resolve));

        expect(res.error).toBeNull();
    });

    test("Send DM Message", async () => {
        const payload = {
            id: "123456789012",
            token: "test",
            payload: {
                data: {
                    roomId: "123456789012",
                    author: { id: "123456789012" },
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
            id: "123456789012",
            token: "test",
            roomId: "123456789012",
            memberId: "123456789013"
        };
        const res = await new Promise(resolve => env.clientSocket.emit("addDmRoomParticipant", payload, resolve));

        expect(res.error).toBeNull();
    });

    test("Remove DM Room Participant", async () => {
        const payload = {
            id: "123456789012",
            token: "test",
            roomId: "123456789012",
            memberId: "123456789013"
        };
        const res = await new Promise(resolve => env.clientSocket.emit("removeDmRoomParticipant", payload, resolve));

        expect(res.error).toBeNull();
    });

    test("Delete DM Room", async () => {
        const payload = {
            id: "123456789012",
            token: "test",
            roomId: "123456789013"
        };
        const res = await new Promise(resolve => env.clientSocket.emit("deleteDmRoom", payload, resolve));

        expect(res.error).toBeNull();
    });
});
