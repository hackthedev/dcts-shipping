import {checkPow, saveConfig, server, serverconfig, socketToIP, usersocket, xssFilters} from "../../index.mjs";
import {
    formatDateTime, generateGid, getJson, getMemberFromKey,
    hasVerifiedKey, resolveCategoryByChannelId, resolveChannelById, resolveGroupByChannelId
} from "../functions/chat/main.mjs";
import { saveChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import {
    checkMemberBan,
    checkMemberMute, checkRateLimit,
    copyObject,
    emitBasedOnMemberId,
    escapeHtml,
    generateId,
    getCastingMemberObject,
    hashPassword, removeFromArray,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import { sendSystemMessage } from "./home/general.mjs";
import {discoverHosts} from "../functions/discovery.mjs";
import {powVerifiedUsers} from "./pow.mjs";
import logger from "../functions/logger.mjs";

function normaliseString(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" && (v.toLowerCase() === "null" || v.toLowerCase() === "undefined")) return null;
    return String(v);
}

function truncateText(text, length) {
    text = String(text || '');
    if (text.length <= length) return text;
    return text.substr(0, length) + '\u2026';
}


function handleInviteCode(member, socket, response){
    // handle user registration and invite only things.
    // if a member was on the server already he wont be prompted for codes.
    if(serverconfig.serverinfo.registration.enabled === false && !serverconfig.servermembers[member?.id]){
        if(!member?.code){
            response({
                error:
                    `Registration is disabled on this server.<br>
                        You need to provide an access code`,
                displayTime: 100 * 60000,
                registration: serverconfig.serverinfo.registration.enabled
            })

            // to be extra sure, remove users from the pow verified array
            // so that if they try to fetch data like member list etc
            // it'll automatically be denied
            removeFromArray(powVerifiedUsers, socket.id)
            return false;
        }
        // code was correct, so lets process its properties
        if(serverconfig.serverinfo.registration.accessCodes[member.code]){
            let code = serverconfig.serverinfo.registration.accessCodes[member.code];

            // check if the code is expired
            if(code.expires !== -1){
                if(new Date().getTime() >= code.expires){
                    response({
                        error:
                            `The invite code you've used has expired`,
                        displayTime: 100 * 60000,
                        registration: serverconfig.serverinfo.registration.enabled
                    })

                    removeFromArray(powVerifiedUsers, socket.id)
                    return false;
                }
            }

            // check if max uses is already used up if not infinite
            if(code.maxUses !== -1){
                if(code.maxUses <= 0){
                    response({
                        error:
                            `The invite code you've used has been used up`,
                        displayTime: 100 * 60000,
                        registration: serverconfig.serverinfo.registration.enabled
                    })

                    removeFromArray(powVerifiedUsers, socket.id)
                    return false;
                }
                else if(code.maxUses > 0){
                    code.maxUses -= 1;
                    saveConfig(serverconfig);
                    return true;
                }
            }
        }
        else{
            response({
                error:
                    `The invite code you've used is incorrect`,
                displayTime: 100 * 60000,
                registration: serverconfig.serverinfo.registration.enabled
            })

            removeFromArray(powVerifiedUsers, socket.id)
            return false;
        }
    }

    return true;
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on('userConnected', async function (member, response) {
        checkRateLimit(socket);

        member.id = xssFilters.inHTMLData(normaliseString(member.id))
        member.name = xssFilters.inHTMLData(normaliseString(member.name))
        member.loginName = xssFilters.inHTMLData(normaliseString(member.loginName))
        member.status = truncateText(xssFilters.inHTMLData(normaliseString(member.status)), 25)
        member.aboutme = truncateText(xssFilters.inHTMLData(normaliseString(member.aboutme)), 500)
        member.icon = xssFilters.inHTMLData(normaliseString(member.icon))
        member.banner = xssFilters.inHTMLData(normaliseString(member.banner))
        member.token = xssFilters.inHTMLData(normaliseString(member.token))
        member.onboarding = xssFilters.inHTMLData(normaliseString(member.onboarding)) === "true";
        member.password = xssFilters.inHTMLData(normaliseString(member.password)) || null;
        member.group = xssFilters.inHTMLData(normaliseString(member.group));
        member.category = xssFilters.inHTMLData(normaliseString(member.category));
        member.channel = xssFilters.inHTMLData(normaliseString(member.channel));
        member.room = xssFilters.inHTMLData(normaliseString(member.room));

        // check if public key was supplied
        if(member?.publicKey && member?.publicKey?.length > 10) {
            member.publicKey = xssFilters.inHTMLData(normaliseString(member?.publicKey));
        }

        // check if knownServers was supplied
        if(member?.knownServers && member?.knownServers?.length > 2) {
            member.knownServers = xssFilters.inHTMLData(member?.knownServers);
            discoverHosts(member.knownServers)
        }

        // check registration code and filter
        if(member?.code && member?.code > 0) {
            member.code = xssFilters.inHTMLData(member?.code);
        }

        // handle invites
        let inviteResult = handleInviteCode(member, socket, response);
        Logger.debug(`Invite result: ${inviteResult}`)
        if(!inviteResult){
            return;
        }
        else{
            // prematurely create a servermembers object since the code was correct and the
            // servermembers object is used to display invite code prompts or not.
            if(!serverconfig.servermembers[member.id]){
                serverconfig.servermembers[member.id] = {
                    id: member.id,
                    token: member.token,
                    onboarding: false
                }
                saveConfig(serverconfig);
            }
        }

        await checkPow(socket);

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

        if (banResult.result === true) {
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

        if (member.id.length === 12 && isNaN(member.id) === false) {
            usersocket[member.id] = socket.id; // deprecated, left for legacy

            // if new member
            if (!serverconfig.servermembers[member.id] || serverconfig.servermembers[member.id]?.onboarding === false) {
                // New Member joined the server
                Logger.debug("New member connected");

                // handle onboarding 
                if (member?.onboarding === false) {
                    // cant proceed as the user needs to setup their account with a password
                    io.to(socket.id).emit("doAccountOnboarding");
                    response({
                        error: "Onboarding not completed",
                        finishedOnboarding: false,
                        type: "success"
                    })

                    Logger.debug("missing onboarding");

                    return;
                }

                var userToken = generateId(48);

                // if the user login name already exists we just append an id to the login name.
                // we then emit it to the user so they can save it.
                let existingUsernames = getJson(serverconfig.servermembers, ["*.id", "*.loginName"]);
                existingUsernames.forEach(user => {
                    let userId = user[0];
                    let loginName = user[1];

                    if(userId === member.id) member.id = generateId(12)
                    if (loginName === member.loginName) member.loginName += generateId(4);
                });

                // setup member
                serverconfig.servermembers[member.id] = JSON.parse(
                    `{
                                  "id": ${member.id},
                                  "token": "${userToken}",
                                  "loginName": "${member.loginName}",
                                  "name": "",
                                  "nickname": null,
                                  "status": "",
                                  "aboutme": "",
                                  "icon": "",
                                  "banner": "",
                                  "joined": ${new Date().getTime()},
                                  "isOnline": 1,
                                  "lastOnline": ${new Date().getTime()},
                                  "isBanned": 0,
                                  "isMuted": 0,
                                  "password": "${await hashPassword(member.password)}",
                                  "publicKey": "",
                                  "isVerifiedKey": false
                                }
                            `);

                // set some values this way because it may cauz errors
                // and i dont wanna manually encode shit etc...
                serverconfig.servermembers[member.id].icon = member.icon;
                serverconfig.servermembers[member.id].banner = member.banner;
                serverconfig.servermembers[member.id].aboutme = member.aboutme;
                serverconfig.servermembers[member.id].status = member.status;
                serverconfig.servermembers[member.id].name = member.name;
                serverconfig.servermembers[member.id].onboarding = true;
                if(member?.publicKey) serverconfig.servermembers[member.id].publicKey = member?.publicKey;

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

                    // if a new member joins lets send a system welcome DM. 
                    // can be edited in config and is enabled on default.
                    if (serverconfig.serverinfo.system.welcome.enabled
                        && serverconfig.serverinfo.system.welcome.message.length > 0) sendSystemMessage(member.id, serverconfig.serverinfo.system.welcome.message)
                    //
                    // you can broadcast messages via the console with the following syntax
                    // msg < userid | * > <Message>
                    //msg * <h3>Welcome to the server!</h3><p>We hope you'll like it here!<br>If you ever need help press the <b>Support</b> button on the top!</p>
                }
                catch (e) {
                    Logger.error("Error on token message sending");
                    Logger.error(e)
                }

                // create copy of server member without token etc
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

                castingMember.message = `<div><label class="username" data-member-id="msg-${castingMember.id}">${castingMember.name}</label> joined the server!</div>`;
                saveChatMessage(castingMember);

                io.emit("updateMemberList");

                socket.join(member.id)
                socket.data.memberId = member.id
                console.log(io.sockets.adapter.rooms)

                // Save System Message and emit join event
                io.emit("newMemberJoined", castingMember);

                response({ finishedOnboarding: true })
            }
            else {
                if (member.token == null || member.token.length !== 48 ||
                    serverconfig.servermembers[member.id].token === null ||
                    serverconfig.servermembers[member.id].token !== member.token) {

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

                // login was successful
                socket.join(member.id)
                if(member.banner == "data:image/jpeg") member.banner = "";
                if(member.icon == "data:image/jpeg") member.icon = "/img/default_pfp.png";

                // set public key and verify it
                if(member?.publicKey){
                    // set pubic key
                    serverconfig.servermembers[member.id].publicKey = xssFilters.inHTMLData(member.publicKey)

                    // check if its valid and change the flag
                    if(await hasVerifiedKey(member.id) === true){
                        serverconfig.servermembers[member.id].isVerifiedKey = true;
                    }
                    else{
                        // otherwise make the client verify their ownership of the key.
                        // key wont be used until its verified
                        emitBasedOnMemberId(member.id, "verifyPublicKey");
                    }
                }

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

                usersocket[member.id] = socket.id;
                socket.data.memberId = member.id;
                response({ finishedOnboarding: true })
            }
        }
        else {
            socket.disconnect();
            Logger.error("ID WAS WRONG ON USER JOIN ");
        }
    });
}
