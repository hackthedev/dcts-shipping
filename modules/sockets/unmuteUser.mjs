import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('unmuteUser', async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (await hasPermission(member.id, "muteUsers")) {

                if (serverconfig.mutelist.hasOwnProperty(member.target)) {
                    delete serverconfig.mutelist[member.target];
                    response({type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unmuted` });
                }
                else {
                    response({type: "error", msg: `The user ${serverconfig.servermembers[member.target].name} isnt muted` });
                }


                serverconfig.servermembers[member.target].isMuted = 0;
                saveConfig(serverconfig);
                
                io.emit("updateMemberList");
            }
            else {
                //response({type: "error", msg: "denied"});
            }
        }
    });
}
