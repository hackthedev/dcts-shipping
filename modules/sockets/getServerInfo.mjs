import { io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on("getServerInfo", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            var serverInfoObj = {
                name: serverconfig.serverinfo.name,
                description: serverconfig.serverinfo.description,
                defaultChannel: serverconfig.serverinfo.defaultChannel,
                uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
                messageLoadLimit: serverconfig.serverinfo.messageLoadLimit,
                tenorEnabled: serverconfig.serverinfo.tenor.enabled,
                sqlEnabled: serverconfig.serverinfo.sql.enabled,
                registrationEnabled: serverconfig.serverinfo.registration.enabled

            };

            if (hasPermission(member.id, "manageServer")) {
                // add more objects here
                serverInfoObj.useCloudflareImageCDN = serverconfig.serverinfo.useCloudflareImageCDN,
                    serverInfoObj.cfAccountId = serverconfig.serverinfo.cfAccountId,
                    serverInfoObj.cfAccountToken = serverconfig.serverinfo.cfAccountToken,
                    serverInfoObj.cfHash = serverconfig.serverinfo.cfHash,
                    serverInfoObj.maxUploadStorage = serverconfig.serverinfo.maxUploadStorage,
                    serverInfoObj.rateLimit = serverconfig.serverinfo.rateLimit,
                    serverInfoObj.dropInterval = serverconfig.serverinfo.dropInterval,
                    serverInfoObj.messageLoadLimit = serverconfig.serverinfo.messageLoadLimit,

                    serverInfoObj.moderation = serverconfig.serverinfo.moderation,
                    serverInfoObj.registration = serverconfig.serverinfo.registration,
                    serverInfoObj.login = serverconfig.serverinfo.login
            }

            response(serverInfoObj);
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
