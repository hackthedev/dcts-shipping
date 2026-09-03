
import { hasPermission } from "../functions/chat/main.mjs";
import {
    validateMemberId
} from "../functions/main.mjs";
import {saveConfig, serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateDiscovery', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true){

            if (await hasPermission(member.id, "manageServer")) {
                
                serverconfig.serverinfo.discovery.enabled = member.enabled
                serverconfig.serverinfo.discovery.hosts = member.hosts;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Discovery was successfully updated" });
            }
            else {
                response({ type: "error", msg: "You cant change the server discovery: Missing permissions" });
            }
        }
    });
}
