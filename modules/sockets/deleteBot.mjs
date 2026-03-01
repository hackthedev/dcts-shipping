import { saveConfig, serverconfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";
import { queryDatabase } from "../functions/mysql/mysql.mjs";

export default (io) => (socket) => {
    socket.on('deleteBot', async function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token) {

            if (!hasPermission(member.id, "manageRoles")) {
                response({ type: "error", error: "Missing permissions" });
                return;
            }

            try {
                const botId = member.botId;
                const bot = serverconfig.servermembers[botId];
                if (!bot || bot.isBot !== true) {
                    response({ type: "error", error: "Bot not found or permission denied" });
                    return;
                }

                // remove from DB first
                try {
                    await queryDatabase("DELETE FROM members WHERE id = ?", [botId]);
                } catch (err) {
                    Logger.error("Couldn't delete bot from db", err);
                    response({ type: "error", error: "Failed to delete bot from database" });
                    return;
                }

                // then from memory and all roles
                delete serverconfig.servermembers[botId];
                if (serverconfig.serverroles && typeof serverconfig.serverroles === "object") {
                    for (const role of Object.values(serverconfig.serverroles)) {
                        if (role?.members && Array.isArray(role.members)) {
                            role.members = role.members.filter((id) => id !== botId);
                        }
                    }
                }
                await saveConfig(serverconfig);

                response({ type: "success" });
            } catch (e) {
                Logger.error("Couldnt delete bot");
                Logger.error(e);
                response({ type: "error", error: "Server Error" });
            }
        }
    });
}
