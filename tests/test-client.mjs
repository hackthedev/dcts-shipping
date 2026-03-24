import { io } from "socket.io-client";
import { serverconfig } from "../index.mjs";
import { mock, beforeAll, afterAll } from "bun:test";
import { Server } from "socket.io";
import { createServer } from "http";

export let defaultTestOverwrites = {
    validateMemberId: mock(async (id, socket, token) => {
        if (serverconfig.servermembers.hasOwnProperty(id)) {
            if (serverconfig.servermembers[id]?.token === token) {
                // check ban to support ban tests
                const { checkMemberBan } = await import("../modules/functions/ban-system/helpers.mjs");
                const banResult = await checkMemberBan(socket, serverconfig.servermembers[id]);
                if (banResult?.result) return false;
                
                return true
            }
        }

        return false;
    }),
    generateId: mock(() => "123456789012"),
    getCastingMemberObject: mock(async () => ({ name: "TestUser", id: "123456789012" })),
    removeFromArray: mock((arr, val) => arr.filter(i => i !== val)),
    io: {
        in: mock(() => ({ emit: mock() })),
        to: mock(() => ({ emit: mock() }))
    },
    powVerifiedUsers: ["123456789012"]
}

mock.module("../modules/sockets/pow.mjs", () => ({
    powVerifiedUsers: defaultTestOverwrites.powVerifiedUsers
}));

mock.module("../modules/functions/main.mjs", () => ({
    validateMemberId: defaultTestOverwrites.validateMemberId,
    generateId: defaultTestOverwrites.generateId,
    getCastingMemberObject: defaultTestOverwrites.getCastingMemberObject,
    autoAnonymizeMember: mock(),
    autoAnonymizeMessage: mock(),
    removeFromArray: defaultTestOverwrites.removeFromArray,
}));

mock.module("../index.mjs", () => ({
    serverconfig: {
        serverinfo: { dms: { maxParticipants: 10 } },
        servermembers: {
            "123456789012": {
                id: "123456789012",
                token: "test",
                name: "Test",
                onboarding: true
            }
        },
        mutelist: {},
        groups: {
            0: {
                info: {
                    id: 0,
                    name: "Home",
                    icon: "img/default_icon.png",
                    banner: "/img/default_banner.png",
                    isDeletable: 1,
                    sortId: 2,
                    access: []
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
                                    sortId: 3,
                                    permissions: {
                                        0: {
                                            readMessages: 1,
                                            sendMessages: 1,
                                            viewChannel: 1,
                                            viewChannelHistory: 1
                                        }
                                    },
                                    msgCount: 0
                                }
                            }
                        }
                    }
                },
                permissions: {
                    0: {
                        viewGroup: 1,
                        sendMessages: 1,
                        readMessages: 1
                    }
                }
            }
        }
    },
    io: defaultTestOverwrites.io,
    signer: {},
    usersocket: {},
    xssFilters: {}
}));

export function createTestClient(target = 2052) {
    const url = typeof target === 'number' ? `http://localhost:${target}` : target;
    const socket = io(url, {
        transports: ["websocket", "polling"],
        autoConnect: false,
        reconnection: false
    });
    return socket;
}

export function connectClient(socket) {
    return new Promise((resolve, reject) => {
        socket.connect();
        socket.on("connect", () => resolve());
        socket.on("connect_error", (err) => reject(err));
    });
}

export function setupSocketMock(socketHandlerFactory) {
    let env = {
        ioServer: null,
        server: null,
        clientSocket: null
    };

    beforeAll(async () => {
        env.server = createServer();
        env.ioServer = new Server(env.server, { cors: { origin: "*" } });

        const handler = socketHandlerFactory(env.ioServer);
        env.ioServer.on("connection", (socket) => {
            if (!socket.rooms) socket.rooms = new Set();
            socket.join = mock((room) => socket.rooms.add(room));
            handler(socket);
        });

        await new Promise(res => env.server.listen(0, res));
        const port = env.server.address().port;

        env.clientSocket = createTestClient(port);
        await connectClient(env.clientSocket);
    });

    afterAll(() => {
        if (env.clientSocket && env.clientSocket.connected) {
            env.clientSocket.disconnect();
        }
        if (env.ioServer) env.ioServer.close();
        if (env.server) env.server.close();
    });

    return env;
}
