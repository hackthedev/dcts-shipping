import { serverconfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { escapeHtml, validateMemberId } from "../functions/main.mjs";

// Bots subscribe to a channel to get messageCreate/Edited; only channels where they have viewChannel. Call again when perms change, no restart.
export default (io) => (socket) => {
    socket.on("botSubscribeChannel", function (member, response) {
        if (!member?.id || !member?.token || !member?.room) {
            if (response) response({ type: "error", error: "id, token and room required" });
            return;
        }
        if (validateMemberId(member.id, socket, member.token) !== true) {
            if (response) response({ type: "error", error: "Invalid credentials" });
            return;
        }
        const entry = serverconfig.servermembers[member.id];
        if (!entry?.isBot) {
            if (response) response({ type: "error", error: "Only bots can subscribe to channels" });
            return;
        }

        const room = member.room.split("-");
        const group = room[0];
        const category = room[1];
        const channel = room[2];

        if (channel === "null" || category === "null" || group === "null") {
            if (response) response({ type: "error", error: "Invalid room format (group-category-channel)" });
            return;
        }

        if (!hasPermission(member.id, "viewChannel", channel)) {
            if (response) response({ type: "error", error: "No viewChannel permission for this channel" });
            return;
        }

        try {
            const channelObj = serverconfig.groups[group]?.channels?.categories[category]?.channel?.[channel];
            if (channelObj == null) {
                if (response) response({ type: "error", error: "Channel not found" });
                return;
            }
            if (channelObj.type !== "text") {
                if (response) response({ type: "error", error: "Only text channels can be subscribed for messageCreate" });
                return;
            }

            socket.join(escapeHtml(member.room));
            if (response) response({ type: "success", msg: "Subscribed to channel" });
        } catch (error) {
            Logger.error(`botSubscribeChannel: ${error?.message || error}`);
            if (response) response({ type: "error", error: "Channel not found" });
        }
    });
};
