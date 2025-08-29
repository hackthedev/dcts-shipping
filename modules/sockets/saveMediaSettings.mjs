import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("saveMediaSettings", function (member, response) {

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageUploads")) {
                try {
                    serverconfig.serverinfo.maxUploadStorage = member.maxLocalUpload;
                    serverconfig.serverinfo.useCloudflareImageCDN = member.useCloudflare;
                    serverconfig.serverinfo.cfAccountId = member.cloudflareAccountId;
                    serverconfig.serverinfo.cfAccountToken = member.cloudflareAccountToken;
                    serverconfig.serverinfo.cfHash = member.cloudflareHash;
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Settings saved successfully, please try to upload a profile picture to see if it works." })
                }
                catch (error) {
                    response({ type: "error", msg: "Server couldnt save settings: " + error })
                }
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage the upload settings" })
            }
        }
    });
}
