import {serverconfig} from "./config.mjs";

export let io = null;

import path from "path";
import {starter} from "./web.mjs";
import {fileURLToPath, pathToFileURL} from "url";
import {Server} from "socket.io";
import fs from "fs";
import Logger from "@hackthedev/terminal-logger";
export let socketToIP = [];

import {
    findInJson,
    formatDateTime,
    getSocketIp,
} from "../chat/main.mjs";
import {powVerifiedUsers} from "../../sockets/pow.mjs";
import {removeFromArray, sendMessageToUser} from "../main.mjs";
import {unbanIp} from "../ban-system/helpers.mjs";

// define quite some important stuff
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// socket loaders. will be replaced with socket package
export const socketHandlers = [];
const activeSockets = new Map();

const withTimeout = (promise, description, timeout = 10000) => {
    let timer;

    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Socket handler step timed out after ${timeout}ms: ${description}`));
        }, timeout);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

export const loadSocketHandlers = async (mainHandlersDir, io) => {
    const fileList = [];

    const scanDir = (dir) => {
        const files = fs.readdirSync(dir, {withFileTypes: true});

        for (const file of files) {
            const filePath = path.join(dir, file.name);

            if (file.isDirectory()) {
                scanDir(filePath);
            } else if (file.name.endsWith(".mjs")) {
                fileList.push(filePath);
            }
        }
    };

    scanDir(mainHandlersDir);
    fileList.sort();

    for (const filePath of fileList) {
        const fileUrl = pathToFileURL(filePath).href;

        try {
            const module = await withTimeout(
                import(fileUrl),
                `import ${filePath}`,
            );

            const {default: handlerFactory} = module;

            if (typeof handlerFactory !== "function") {
                Logger.warn(`Ignored invalid socket handler in ${filePath}`);
                continue;
            }

            const handler = await withTimeout(
                Promise.resolve().then(() => handlerFactory(io)),
                `factory ${filePath}`,
            );

            if (typeof handler === "function") {
                socketHandlers.push(handler);
                Logger.debug(`Preloaded socket handler: ${filePath}`);
            } else {
                Logger.warn(`Ignored invalid socket handler in ${filePath}`);
            }
        } catch (err) {
            Logger.error(`Error importing socket handler: ${fileUrl}`);
            Logger.error(err);
        }
    }
};


export const registerSocketEvents = (socket) => {
    try {
        const attachedHandlers = [];

        for (const handler of socketHandlers) {
            const cleanup = handler(socket);
            if (typeof cleanup === "function") {
                attachedHandlers.push(cleanup);
            }
        }

        activeSockets.set(socket.id, attachedHandlers);
    } catch (err) {
        console.error("Error registering socket events:", err);
    }
};

export async function listenToIO(){
    const {server} = starter.getServerInfo();

    if(!server){
        throw new Error("server was undefined!")
    }

    io = new Server(server, {
        maxHttpBufferSize: 1e8,
        secure: true,
        pingInterval: 25000,
        pingTimeout: 60000,
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: false,
        },
    });

    io.on("connection", async function (socket) {
        // socket ip
        var ip = getSocketIp(socket);
        if (serverconfig.banlist[ip]) {
            socket.disconnect(true);
        }

        registerSocketEvents(socket);

        socket.on("disconnect", async () => {
            //Logger.info(`Socket ${socket.id} disconnected, cleaning up handlers...`);
            if (activeSockets.has(socket.id)) {
                activeSockets.get(socket.id).forEach((cleanup) => cleanup());
                activeSockets.delete(socket.id); // Remove socket entry
            }

            // clean up stuff
            try {
                removeFromArray(powVerifiedUsers, socket.id);
            } catch (cleanupError) {
                Logger.error(cleanupError);
            }
        });

        // Check if user ip is blacklisted
        socketToIP[socket] = ip;
        if (serverconfig.ipblacklist.hasOwnProperty(ip)) {
            if (Date.now() <= serverconfig.ipblacklist[ip]) {
                let detailText = "";
                let banListResult = findInJson(serverconfig?.banlist, "ip", ip);

                if (banListResult != null) {
                    let bannedUntilDate = new Date(banListResult.until);
                    bannedUntilDate.getFullYear() === "9999"
                        ? (detailText = "permanently banned")
                        : (detailText = `banned until: <br>${formatDateTime(bannedUntilDate)}`);
                    detailText +=
                        banListResult?.reason !== null
                            ? `<br><br>Reason:<br>${banListResult.reason}`
                            : "";
                }

                sendMessageToUser(
                    socket.id,
                    JSON.parse(
                        `{
                            "title": "IP Blacklisted ${ip}",
                            "message": "Your IP Address was ${detailText || "banned"}",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "onclick='closeModal()'"
                                }
                            },
                            "type": "error",
                            "displayTime": 60000
                        }`,
                    ),
                );

                socket.disconnect();

                Logger.debug("Disconnected user because ip is blacklisted");
            } else if (Date.now() > serverconfig.ipblacklist[ip]) {
                unbanIp(socket);
            }
        }
    });
}