import { test, expect, describe, mock } from "bun:test";
import { defaultTestOverwrites, setupSocketMock } from "../../test-client.mjs";

// ok so these mocks seem to be super cool as they can kinda
// overwrite functions and what not so we dont fuck shit up
// which is hella cool

// Import the handler AFTER mocks
import dmsRoomHandler from "../../../modules/sockets/home/dms/rooms.mjs";
import {getLocalPlugins} from "../../../modules/sockets/routes/plugins.mjs";
import {getCastingMemberObject} from "../../../modules/functions/main.mjs";
import {serverconfig} from "../../../modules/functions/init/config.mjs";

mock.module("../modules/functions/main.mjs", () => ({
    checkHttpAuth: mock(async (allowPass) => {
        return {
            valid: true,
            member: await getCastingMemberObject(serverconfig.servermembers["123456789012"])
        }
    }),
    getCastingMemberObject: defaultTestOverwrites.getCastingMemberObject,
}));


describe("Plugin System", () => {

    test("Get Local Plugins", async () => {
        const plugins = await getLocalPlugins();
        expect(typeof plugins).toBe("object");
    });

    // would love to make more tests like install etc but honestly it doesnt make
    // sense rn as it will be changed again anyway to be a custom lib.
});
