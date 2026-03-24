import { test, expect, describe, mock } from "bun:test";
import { defaultTestOverwrites, setupSocketMock } from "../test-client.mjs";


mock.module("../../modules/functions/mysql/mysql.mjs", () => ({
    queryDatabase: mock(async (query, args) => {
        const q = query.toLowerCase();

        // return for queries :p
        if (q.includes("insert into") || q.includes("update ") || q.includes("delete from")) {
            return { affectedRows: 1 };
        }

        return [];
    })
}));

let slowmodeResult = false
let rateLimitResult = false
mock.module("../../modules/functions/anti-spam/messages.mjs", () => ({
    getChannelRateLimit: mock(async (query, args) => {
        return {
            currentHourly: 0,
            currentDaily: 0,
            baseline: 0,
            slowmode: slowmodeResult,
            rateLimited: rateLimitResult
        }
    })
}));

mock.module("../../modules/functions/io.mjs", () => ({
    saveChatMessage: mock(async (query, args) => {})
}));

// used for the mock below to be able to toggle this shit to test
// different scenarios lol. there may be a better way for this
// but as of right now it works at least
let mockPermissionResult = true;
let isAdmin = false
mock.module("../../modules/functions/chat/main.mjs", () => ({
    hasPermission: mock(async (id, permission) => {
        if(!isAdmin && permission === "bypassSlowmode") return false
        if(!isAdmin && permission === "bypassRatelimit") return false

        return mockPermissionResult;
    }),
}));

let getMemberLatestMessageTimestamp = null;
mock.module("../../modules/functions/chat/helper.mjs", () => ({
    getMemberLatestMessage: mock(async (memberId, issuerId) => {
        return {
            timestamp: getMemberLatestMessageTimestamp ?? DateTools.getDateFromOffset("-5 minutes").getTime()
        }
    }),
}));

let checkMemberMuteResult = false;
mock.module("../../modules/functions/main.mjs", () => ({
    checkMemberMute: mock((socket, memberId) => {
        if(checkMemberMuteResult){
            return {
                result: true,
                timestamp: new Date().getTime(),
                reason: "Test Case"
            }
        }
        else{
            return {
                result: false,
                timestamp: null,
                reason: null
            }
        }
    }),
}));

mock.module("../../modules/sockets/resolveMessage.mjs", () => ({
    processMessageObject: mock(async (msg) => ({ author: { id: "user12345678" } })),
    checkMessageObjAuthor: mock()
}));

let checkMemberBanResult = false;
mock.module("../../modules/functions/ban-system/helpers.mjs", () => ({
    checkMemberBan: mock(async (socket, member) => {
        if(checkMemberBanResult){
            return {result: true, timestamp: DateTools.getDateFromOffset("+5 minutes"), reason: "Test Case"};
        }
        else{
            return {result: false, timestamp: null, reason: null};
        }
    }),
}));


// Import the handler AFTER mocks
import messageSendHandler from "../../modules/sockets/messageSend.mjs";
import DateTools from "@hackthedev/datetools";
import {getMemberLatestMessage} from "../../modules/functions/chat/helper.mjs";
import {serverconfig} from "../../index.mjs";

describe("Server Chat", () => {
    const env = setupSocketMock(messageSendHandler);

    test("Server connection", () => {
        expect(env.clientSocket.connected).toBeTrue();
    });

    test("Send Message", async () => {
        const payload = { 
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = true
        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));
        
        expect(res.error).toBeNull();
    });

    test("Send Message (without perm)", async () => {
        const payload = {
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = false
        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));
        expect(res.error).toBe("You cant chat here! Missing permissions");
    });

    test("Send Message (muted)", async () => {
        const payload = {
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = true
        checkMemberMuteResult = true;
        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));

        expect(res.error).not.toBeNull();
        expect(res.muted).toBe(true);
    });

    test("Send Message (banned)", async () => {
        const payload = {
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = true
        checkMemberMuteResult = false;
        checkMemberBanResult = true;

        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));
        expect(res.error).not.toBeNull();
    });

    test("Send Message (slow mode)", async () => {
        const payload = {
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = true
        checkMemberMuteResult = false;
        checkMemberBanResult = false;

        slowmodeResult = true
        rateLimitResult = false
        getMemberLatestMessageTimestamp = new Date().getTime()

        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));

        // here we need to do some calc shit like the server does so the expectedTimestamp etc will match
        let diff = DateTools.getDateFromOffset(serverconfig.serverinfo.moderation.ratelimit.actions.user_slowmode_duration, new Date(getMemberLatestMessageTimestamp)).getTime() - getMemberLatestMessageTimestamp;
        let expectedTimestamp = getMemberLatestMessageTimestamp + diff;

        expect(res.error).not.toBeNull();
        expect(res.slowmode).toBe(expectedTimestamp);
    });

    test("Send Message (rate limited)", async () => {
        const payload = {
            author: {
                id: "123456789012"
            },
            token: "test",
            message: "Test message",
            group: 0,
            category: 0,
            channel: 0,
        };

        mockPermissionResult = true
        checkMemberMuteResult = false;
        checkMemberBanResult = false;

        slowmodeResult = false
        rateLimitResult = true
        isAdmin = false;

        const res = await new Promise(resolve => env.clientSocket.emit("messageSend", payload, resolve));
        expect(res.error).not.toBeNull();
        expect(res.rateLimited).toBe(true);
    });
});
