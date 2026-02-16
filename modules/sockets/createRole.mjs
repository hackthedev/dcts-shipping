import { saveConfig, serverconfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { generateId, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('createRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    var roleid = generateId(4);
                    
                    serverconfig.serverroles[roleid] = JSON.parse(
                        `{
                                    "info": {
                                        "id": "${roleid}",
                                        "name": "New Role",
                                        "icon": null,
                                        "color": "#FFFFFF",
                                        "deletable": 1,
                                        "sortId": ${generateId(4)},
                                        "displaySeperate": 0
                                    },
                                    "permissions": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "uploadFiles": 1
                                    },
                                    "members": [
                                    ],
                                    "token": []
                                }`
                    );

                    saveConfig(serverconfig);                    
                    response({ type: "success", msg: "The role has been successfully created" });
                }
                catch (e) {
                    Logger.error("Unable to create role");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", permission: "denied" });
            }
        }
        else {
            Logger.error("Token or ID incorrect");
        }
    });
}
