import { beforeEach, describe, expect, mock, test } from "bun:test";

function createBaseServerconfig() {
    return {
        groups: {
            0: {
                info: {
                    id: 0,
                    name: "Home"
                },
                channels: {
                    categories: {
                        0: {
                            info: {
                                id: 0,
                                name: "General",
                                sortId: 0
                            },
                            channel: {
                                0: {
                                    id: 0,
                                    name: "chat",
                                    type: "text",
                                    description: "",
                                    sortId: 0,
                                    permissions: {}
                                }
                            }
                        }
                    }
                }
            }
        }
    };
}

const serverconfig = createBaseServerconfig();
let hasPermissionResult = true;
let validateMemberIdResult = true;
let generatedId = "1234";
const saveConfig = mock(() => {});
const hasPermission = mock(async () => hasPermissionResult);
const getChannelTree = mock(() => ({ tree: true }));
const generateId = mock(() => generatedId);
const validateMemberId = mock(async () => validateMemberIdResult);
const loggerError = mock(() => {});
const stripHTML = mock((value) => String(value ?? "").replace(/<[^>]*>/g, ""));

mock.module("../../index.mjs", () => ({
    saveConfig,
    serverconfig
}));

mock.module("../../modules/functions/chat/main.mjs", () => ({
    getChannelTree,
    hasPermission
}));

mock.module("../../modules/functions/main.mjs", () => ({
    generateId,
    validateMemberId
}));

mock.module("../../modules/functions/logger.mjs", () => ({
    default: {
        error: loggerError
    }
}));

mock.module("../../modules/functions/sanitizing/functions.mjs", () => ({
    stripHTML
}));

import createChannelHandler from "../../modules/sockets/createChannel.mjs";

function resetServerconfig() {
    for (const key of Object.keys(serverconfig)) {
        delete serverconfig[key];
    }

    Object.assign(serverconfig, createBaseServerconfig());
}

function registerCreateChannel(io) {
    const handlers = {};
    const socket = {
        on: mock((event, handler) => {
            handlers[event] = handler;
        })
    };

    createChannelHandler(io)(socket);
    return handlers.createChannel;
}

function clearMockCalls(fn) {
    if (typeof fn.mockClear === "function") {
        fn.mockClear();
        return;
    }

    if (fn?.mock?.calls) {
        fn.mock.calls.splice(0, fn.mock.calls.length);
    }
}

describe("Create Channel Socket", () => {
    let io;
    let createChannel;

    beforeEach(() => {
        resetServerconfig();

        hasPermissionResult = true;
        validateMemberIdResult = true;
        generatedId = "1234";

        clearMockCalls(saveConfig);
        clearMockCalls(hasPermission);
        clearMockCalls(getChannelTree);
        clearMockCalls(generateId);
        clearMockCalls(validateMemberId);
        clearMockCalls(loggerError);
        clearMockCalls(stripHTML);

        io = {
            emit: mock(() => {})
        };

        createChannel = registerCreateChannel(io);
    });

    test("creates a sanitized channel and emits the updated tree", async () => {
        const response = mock(() => {});

        await createChannel({
            id: "123456789012",
            token: "test",
            group: " 0 ",
            category: " 0 ",
            value: "  <b>New Channel</b>  ",
            type: " text "
        }, response);

        expect(response.mock.calls[0][0]).toEqual({ error: null });
        expect(serverconfig.groups[0].channels.categories[0].channel[1234]).toEqual({
            id: "1234",
            name: "New Channel",
            type: "text",
            description: "Default Channel Description",
            sortId: 0,
            permissions: {
                0: {
                    viewChannelHistory: 0,
                    readMessages: 0,
                    sendMessages: 0,
                    viewChannel: -1
                }
            }
        });
        expect(saveConfig).toHaveBeenCalledTimes(1);
        expect(io.emit).toHaveBeenCalledWith("receiveChannelTree", { tree: true });
    });

    test("rejects channel creation without permissions", async () => {
        hasPermissionResult = false;
        const response = mock(() => {});

        await createChannel({
            id: "123456789012",
            token: "test",
            group: "0",
            category: "0",
            value: "New Channel",
            type: "text"
        }, response);

        expect(response.mock.calls[0][0]).toEqual({ error: "Missing permissions to create channel" });
        expect(serverconfig.groups[0].channels.categories[0].channel[1234]).toBeUndefined();
    });

    test("rejects stale category ids", async () => {
        const response = mock(() => {});

        await createChannel({
            id: "123456789012",
            token: "test",
            group: "0",
            category: "999",
            value: "New Channel",
            type: "text"
        }, response);

        expect(response.mock.calls[0][0]).toEqual({ error: "Couldnt create channel: missing category" });
        expect(saveConfig).toHaveBeenCalledTimes(0);
    });

    test("rejects blank channel names after sanitizing", async () => {
        const response = mock(() => {});

        await createChannel({
            id: "123456789012",
            token: "test",
            group: "0",
            category: "0",
            value: "   <b></b>   ",
            type: "text"
        }, response);

        expect(response.mock.calls[0][0]).toEqual({ error: "Couldnt create channel: missing channel name" });
        expect(saveConfig).toHaveBeenCalledTimes(0);
    });

    test("rejects invalid channel types", async () => {
        const response = mock(() => {});

        await createChannel({
            id: "123456789012",
            token: "test",
            group: "0",
            category: "0",
            value: "New Channel",
            type: "video"
        }, response);

        expect(response.mock.calls[0][0]).toEqual({ error: "Couldnt create channel: invalid channel type" });
        expect(saveConfig).toHaveBeenCalledTimes(0);
    });
});
