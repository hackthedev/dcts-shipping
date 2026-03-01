import { saveConfig, serverconfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    socket.on('getBots', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token) {

            if (!hasPermission(member.id, "manageRoles")) {
                response({ type: "error", error: "Missing permissions" });
                return;
            }

            try {
                const bots = Object.values(serverconfig.servermembers).filter(m => m.isBot === true);

                // remove sensitive info except token (since the owner needs the token to run the bot)
                const safeBots = bots.map(b => ({
                    id: b.id,
                    name: b.name,
                    icon: b.icon,
                    token: b.token
                }));

                response({ type: "success", bots: safeBots });
            } catch (e) {
                Logger.error("Couldnt get bots");
                Logger.error(e);
                response({ type: "error", error: "Server Error" });
            }
        }
    });
}
