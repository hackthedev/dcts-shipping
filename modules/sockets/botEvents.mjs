import { BOT_GLOBAL_LISTEN_ROOM } from "./botListenAllChannels.mjs";
import { hasPermission } from "../functions/chat/main.mjs";

export { BOT_GLOBAL_LISTEN_ROOM };

// Emit to all sockets in BOT_GLOBAL_LISTEN_ROOM (server-wide bot events). Only bots that joined via botListenAllChannels get it.
export async function emitToAllBots(io, eventName, payload) {
    const sockets = await io.in(BOT_GLOBAL_LISTEN_ROOM).fetchSockets();
    for (const s of sockets) {
        s.emit(eventName, payload);
    }
}

// Emit only to bots that have viewChannel for this channel (messageCreate, messageEdited, delete, reactions, typing).
export async function emitToBotsWithViewChannel(io, group, category, channel, eventName, payload) {
    const sockets = await io.in(BOT_GLOBAL_LISTEN_ROOM).fetchSockets();
    for (const s of sockets) {
        const botId = s.data?.memberId;
        if (botId && hasPermission(botId, "viewChannel", channel)) {
            s.emit(eventName, payload);
        }
    }
}

// Empty default export so the socket scanner loads this file.
export default () => () => {};
