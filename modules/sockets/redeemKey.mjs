import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('redeemKey', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token)
        ) {
            if(response && !member?.id) response({ error: "Missing ID for Auth!" })
            if(response && !member?.token) response({ error: "Missing Token for Auth!" })
            if(response && !member?.key) response({ error: "Missing Key to redeem!" })

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.key = xssFilters.inHTMLData(member.key);

            Logger.debug(`User ${serverconfig.servermembers[member.id].name} (${serverconfig.servermembers[member.id].id}) is trying to redeem a role using the following key:`)
            Logger.debug(`${member.key}`)

            var roles = serverconfig.serverroles;
            var foundTokenInRole = false;
            var alreadyInRole = false;

            Object.keys(roles).forEach(function (roleId) {
                var role = roles[roleId];

                if (role.token.includes(member.key)) {

                    // If the member already is in that role we want to deny it
                    if (role.members.includes(member.id)) {
                        alreadyInRole = true;
                        return; // https://youtu.be/WUOtCLOXgm8?si=XRe4XUStDBm_D95O&t=39
                    }

                    try {
                        role.members.push(member.id)
                        role.token.pop(member.key); // not a user token, a key token for the role!
                        saveConfig(serverconfig);

                        foundTokenInRole = true;

                        Logger.debug(`User ${serverconfig.servermembers[member.id].name} (${serverconfig.servermembers[member.id].id}) redeemed the role ${role.info.name} (${roleId}) with the following key`, "Log")
                        Logger.debug(`${member.key}`, "Log")

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                "title": "${role.info.name} redeemed!",
                                "message": "",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": "closeModal();"
                                    }
                                },
                                "type": "success",
                                "popup_type": "confirm"
                            }`));

                        if(response) response({ error: null })

                        io.emit("updateMemberList");
                    }
                    catch (e) {

                        Logger.error("Couldnt redeem key".red)
                        Logger.error(e);

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                            "title": "Couldnt redeem key",
                            "message": "A unkown error occured",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "closePrompt();"
                                }
                            },
                            "popup_type": "confirm",
                            "type": "error"
                        }`));

                        if(response) response({ error: "Couldnt redeem key!" })
                    }
                }
            });

            // Only show message if all loops failed
            if (foundTokenInRole === false) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Wrong key!",
                        "message": "The key you've entered was wrong",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "popup_type": "confirm",
                        "type": "error"
                    }`));

                if(response) response({ error: "Key not found!" })
            }

            if (alreadyInRole) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "You cant use this key anymore.",
                        "message": "You are already part of this role!",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "closePrompt();"
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));

                if(response) response({ error: "You cant use this key because you already have this role!" })
            }
        }
    });
}
