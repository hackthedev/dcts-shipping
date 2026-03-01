import { serverconfig } from "../../index.mjs";
import { validateMemberId } from "../functions/main.mjs";

// Room for bots that get messageCreate only for channels they have viewChannel on (filtered server-side).
export const BOT_GLOBAL_LISTEN_ROOM = "bot_global_listen";

export default (io) => (socket) => {
    socket.on("botListenAllChannels", function (member, response) {
        if (!member?.id || !member?.token) {
            if (response) response({ type: "error", error: "id and token required" });
            return;
        }
        if (validateMemberId(member.id, socket, member.token) !== true) {
            if (response) response({ type: "error", error: "Invalid credentials" });
            return;
        }
        const entry = serverconfig.servermembers[member.id];
        if (!entry?.isBot) {
            if (response) response({ type: "error", error: "Only bots can listen to channels" });
            return;
        }
        socket.join(BOT_GLOBAL_LISTEN_ROOM);
        if (response) response({ type: "success", msg: "Listening to channels you have viewChannel for" });
    });
};
