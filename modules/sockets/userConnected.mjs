import { saveConfig, serverconfig, socketToIP, usersocket, xssFilters } from "../../index.mjs";
import { formatDateTime, getJson, resolveCategoryByChannelId, resolveChannelById, resolveGroupByChannelId } from "../functions/chat/main.mjs";
import { saveChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { checkMemberBan, checkMemberMute, copyObject, escapeHtml, generateId, getCastingMemberObject, hashPassword, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('userConnected', async function (member, response) {
        member.id = xssFilters.inHTMLData(member.id)
        member.name = xssFilters.inHTMLData(member.name)
        member.loginName = xssFilters.inHTMLData(member.loginName)
        member.status = xssFilters.inHTMLData(member.status)
        member.aboutme = xssFilters.inHTMLData(member.aboutme)
        member.icon = xssFilters.inHTMLData(member.icon)
        member.banner = xssFilters.inHTMLData(member.banner)
        member.token = xssFilters.inHTMLData(member.token)
        member.onboarding = xssFilters.inHTMLData(member.onboarding) === "true";
        member.password = xssFilters.inHTMLData(member.password) || null;
        member.group = xssFilters.inHTMLData(member.group);
        member.category = xssFilters.inHTMLData(member.category);
        member.channel = xssFilters.inHTMLData(member.channel);
        member.room = xssFilters.inHTMLData(member.room);

        //var ip = socket.handshake.headers["x-real-ip"];
        //var port = socket.handshake.headers["x-real-port"];

        // check member ban
        let banResult = checkMemberBan(socket, member);
        let banText = "";
        if (banResult?.timestamp) {
            if (new Date(banResult.timestamp).getFullYear() == "9999") {
                banText = "banned permanently";
            }
            else {
                banText = `banned until <br>${formatDateTime(new Date(banResult.timestamp))}`
            }
        }

        if (banResult?.reason) {
            banText += `<br><br>Reason:<br>${banResult.reason}`
        }

        if (banResult.result == true) {
            response({ error: `You've been ${banText}`, type: "error", msg: `You've been ${banText}`, msgDisplayDuration: 1000 * 60 })
            socket.disconnect();
            return;
        }

        // call checkMemberMute so it unmutes automatically
        checkMemberMute(socket, member);

        Logger.debug(`Member connected. User: ${member.name} (${member.id} - ${socketToIP[socket]})`);

        // Check if member is in default role
        if (serverconfig.serverroles["0"].members.includes(member.id) == false) {
            serverconfig.serverroles["0"].members.push(member.id);
            saveConfig(serverconfig);
        }

        if (member.id.length == 12 && isNaN(member.id) == false) {
            usersocket[member.id] = socket.id;

            // if new member
            if (serverconfig.servermembers[member.id] == null) {
                // New Member joined the server

                // handle onboarding 
                if (member.onboarding === false) {
                    // cant proceed as the user needs to setup their account with a password
                    io.to(socket.id).emit("doAccountOnboarding");
                    response({
                        error: "Onboarding not completed",
                        finishedOnboarding: false,
                        msg: "Welcome!",
                        text: "Finish your account setup to continue",
                        type: "success"
                    })
                    return;
                }

                var userToken = generateId(48);

                // if the user login name already exists we just append an id to the login name.
                // we then emit it to the user so they can save it.
                let existingUsernames = getJson(serverconfig.servermembers, ["*.id", "*.loginName"]);
                existingUsernames.forEach(user => {
                    let userId = user[0];
                    let loginName = user[1];

                    if(loginName == member.loginName) member.loginName += generateId(4);
                });


                // setup member
                serverconfig.servermembers[member.id] = JSON.parse(
                    `{
                                  "id": ${member.id},
                                  "token": "${userToken}",
                                  "loginName": "${member.loginName}",
                                  "name": "${member.name}",
                                  "nickname": null,
                                  "status": "${member.status}",
                                  "aboutme": "${member.aboutme}",
                                  "icon": "${member.icon}",
                                  "banner": "${member.banner}",
                                  "joined": ${new Date().getTime()},
                                  "isOnline": 1,
                                  "lastOnline": ${new Date().getTime()},
                                  "isBanned": 0,
                                  "isMuted": 0,
                                  "password": "${await hashPassword(member.password)}"
                                }
                            `);
                saveConfig(serverconfig);

                try {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Welcome ${serverconfig.servermembers[member.id].name} <3",
                            "message": "",
                            "buttons": {
                                "0": {
                                    "text": "Saved!",
                                    "events": "refreshValues()"
                                }
                            },
                            "action": "register",
                            "token": "${serverconfig.servermembers[member.id].token}",
                            "icon": "${serverconfig.servermembers[member.id].icon}",
                            "banner": "${serverconfig.servermembers[member.id].banner}",
                            "status": "${serverconfig.servermembers[member.id].status}",
                            "aboutme": "${serverconfig.servermembers[member.id].aboutme}",
                            "loginName": "${serverconfig.servermembers[member.id].loginName}",
                            "type": "success"
                        }`));
                }
                catch (e) {
                    Logger.error("Error on token message sending");
                    Logger.error(e)
                }

                // create copy of server member without token
                var castingMember = getCastingMemberObject(serverconfig.servermembers[member.id]);
                delete castingMember.token;
                delete castingMember.password;

                // Save system message to the default channel
                castingMember.group = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.category = resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.channel = serverconfig.serverinfo.defaultChannel;
                castingMember.room = `${resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel)}-${resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel)}-${serverconfig.serverinfo.defaultChannel}`;

                castingMember.timestamp = new Date().getTime();
                castingMember.messageId = generateId(12);
                castingMember.isSystemMsg = true;

                castingMember.message = `${member.name} joined the server!`;
                saveChatMessage(castingMember);

                io.emit("updateMemberList");

                // Save System Message and emit join event
                io.emit("newMemberJoined", castingMember);

                response({ finishedOnboarding: true })
            }
            else {

                if (member.token == null || member.token.length != 48 ||
                    serverconfig.servermembers[member.id].token == null ||
                    serverconfig.servermembers[member.id].token != member.token) {


                    try {
                        response({ error: "Invalid login", title: "Invalid Login", msg: "Something went wrong with your login.<br><a onclick='UserManager.resetAccount();'>Reset Session</a><br>", type: "error", displayTime: 1000 * 60 * 60 })
                        return;
                    }
                    catch (e) {
                        Logger.error("Error on error message sending");
                        Logger.error(e);
                    }


                    Logger.debug("User did not have a valid token.");

                    response({ error: "Invalid Token", finishedOnboarding: true })
                    socket.disconnect();
                    return;
                }

                usersocket[member.id] = socket.id;

                serverconfig.servermembers[member.id].name = xssFilters.inHTMLData(member.name);
                serverconfig.servermembers[member.id].status = xssFilters.inHTMLData(member.status);
                serverconfig.servermembers[member.id].aboutme = xssFilters.inHTMLData(member.aboutme);
                serverconfig.servermembers[member.id].icon = xssFilters.inHTMLData(member.icon);
                serverconfig.servermembers[member.id].banner = xssFilters.inHTMLData(member.banner);
                serverconfig.servermembers[member.id].lastOnline = new Date().getTime();
                saveConfig(serverconfig);

                if (serverconfig.servermembers[member.id].isOnline == 0) {
                    // Member is back online
                    serverconfig.servermembers[member.id].isOnline = 1;

                    var lastOnline = serverconfig.servermembers[member.id].lastOnline / 1000;

                    var today = new Date().getTime() / 1000;
                    var diff = today - lastOnline;
                    var minutesPassed = Math.round(diff / 60);


                    if (minutesPassed > 5) {
                        io.emit("updateMemberList");
                        io.emit("memberOnline", getCastingMemberObject(member));
                    }
                }
                else {
                    io.emit("updateMemberList");
                    io.emit("memberPresent", getCastingMemberObject(member));
                }

                response({ finishedOnboarding: true })
            }
        }
        else {
            socket.disconnect();
            Logger.debug("ID WAS WRONG ON USER JOIN ");
        }
    });
}
