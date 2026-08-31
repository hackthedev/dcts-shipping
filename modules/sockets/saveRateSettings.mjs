import { saveConfig} from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("saveRateSettings", async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if (await hasPermission(member.id, "manageRateSettings")) {
                try {
                    serverconfig.serverinfo.rateLimit = member.newRateLimit;
                    serverconfig.serverinfo.dropInterval = member.newDropInterval;
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Settings saved successfully." })
                }
                catch (error) {
                    response({ type: "error", msg: "Server couldnt save rate settings: " + error })
                }
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage the rate settings" })
            }
        }
    });
}
