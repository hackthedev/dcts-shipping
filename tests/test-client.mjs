import { io } from "socket.io-client";
import {serverconfig} from "../index.mjs";
import { mock, beforeAll, afterAll } from "bun:test";
import { Server } from "socket.io";
import { createServer } from "http";

export let defaultTestOverwrites = {
    validateMemberId: mock(async (id, socket, token) => {
        if(serverconfig.servermembers.hasOwnProperty(id)){
            if(serverconfig.servermembers[id]?.token === token){
                return true
            }
        }

        return false;
    }),
    generateId: mock(() => "123456789012"),
    getCastingMemberObject: mock(async () => ({ name: "TestUser", id: "user12345678" })),
    removeFromArray: mock((arr, val) => arr.filter(i => i !== val)),
    io: { 
        in: mock(() => ({ emit: mock() })), 
        to: mock(() => ({ emit: mock() })) 
    }
}

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
