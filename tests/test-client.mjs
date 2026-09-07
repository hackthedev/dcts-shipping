import { io } from "socket.io-client";
import { beforeAll, afterAll } from "bun:test";
import { initSetupWizard } from "../index.mjs";
import { starter } from "../modules/functions/init/web.mjs";
import {serverconfig, initConfig} from "../modules/functions/init/config.mjs";
import {powVerifiedUsers} from "../modules/sockets/pow.mjs";

export let clientSocket;

beforeAll(async () => {
    initConfig();
    await initSetupWizard(true);
    await installWebLibs();

    const { server } = starter.getServerInfo();

    clientSocket = io(`http://localhost:${server.address().port}`, {
        transports: ["websocket"],
        reconnection: false
    });

    await new Promise((resolve, reject) => {
        clientSocket.once("connect", resolve);
        clientSocket.once("connect_error", reject);
    });

    // This will create test members
    serverconfig.servermembers["123456789012"] ??= {
        id: "123456789012",
        token: "test",
        name: "System Test Member 1",
        onboarding: true
    }

    serverconfig.servermembers["123456789013"] ??= {
        id: "123456789013",
        token: "test",
        name: "System Test Member 2",
        onboarding: true
    }

    powVerifiedUsers.push(clientSocket.id);
}, 30_000);

afterAll(() => {
    clientSocket?.disconnect();
});