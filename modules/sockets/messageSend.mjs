import { serverconfig, typingMembers, usersocket, xssFilters } from "../../index.mjs";
import { convertMention } from "../functions/chat/helper.mjs";
import { formatDateTime, hasPermission } from "../functions/chat/main.mjs";
import { saveChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { checkMemberMute, checkRateLimit, copyObject, escapeHtml, generateId, getCastingMemberObject, sanitizeInput, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import { decodeFromBase64, getChatMessagesFromDb } from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('messageSend', async function (memberOriginal) {
        checkRateLimit(socket);

        if (validateMemberId(memberOriginal.id, socket) == true
            && serverconfig.servermembers[memberOriginal.id].token == memberOriginal.token
        ) {

            // Remove token from cloned object so we dont broadcast it
            let member = copyObject(memberOriginal);

            // check member mute
            let muteResult = checkMemberMute(socket, member);
            let muteText = "";
            if (muteResult?.timestamp) {
                if (new Date(muteResult.timestamp).getFullYear() == "9999") {
                    muteText = "muted permanently";
                }
                else {
                    muteText = `muted until <br>${formatDateTime(new Date(muteResult.timestamp))}`
                }
            }
            if (muteResult?.reason) {
                muteText += `<br><br>Reason:<br>${muteResult.reason}`
            }
            if (muteResult.result == true) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                        "title": "You have been ${muteText}",
                                        "message": "",
                                        "buttons": {
                                            "0": {
                                                "text": "Ok",
                                                "events": ""
                                            }
                                        },
                                        "type": "error",
                                        "popup_type": "confirm"
                                    }`));
                return;
            }

            if (isNaN(member.group) == true) {
                Logger.debug("Group was not a number");
                return;
            }
            if (isNaN(member.channel) == true) {
                Logger.debug("Channel was not a number");
                return;
            }
            if (isNaN(member.category) == true) {
                Logger.debug("Category was not a number");
                return;
            }
            if (member.message.replaceAll(" ").length <= 0) {
                Logger.debug("Message is shorter than 1 charachter");
                return;
            }

            if (!hasPermission(member.id, ["sendMessages", "viewChannel"], member.channel, "all")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                        "title": "You cant chat here",
                                        "message": "You cant send a message in this channel, sorry.",
                                        "buttons": {
                                            "0": {
                                                "text": "Ok",
                                                "events": ""
                                            }
                                        },
                                        "type": "error",
                                        "popup_type": "confirm"
                                    }`));

                return;
            }

            // Check if room exists
            try {
                if (serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel] != null) {

                    // bug
                    // editing message makes new id and timestamp
                    // fetch existing object and load it?
                    let messageid = generateId(12);
                    member.timestamp = new Date().getTime();
                    member.messageId = messageid;

                    member.icon = escapeHtml(member.icon);
                    member.name = escapeHtml(member.name);

                    member.message = sanitizeInput(member.message);
                    member.message = convertMention(member.message);

                    // replace empty lines
                    member.message = clearMessage(member.message, messageid)

                    if (member.message == "" || member.message.length == 0) {
                        console.log("Message was empty")
                        return;
                    }

                    // Display role color of the highest role
                    var userRoleArr = [];
                    Object.keys(serverconfig.serverroles).forEach(function (role) {

                        if (serverconfig.serverroles[role].members.includes(member.id) &&
                            serverconfig.serverroles[role].info.displaySeperate == 1) {
                            userRoleArr.push(serverconfig.serverroles[role]);
                        }
                    });

                    // Show user color in highest role
                    userRoleArr = userRoleArr.sort((a, b) => {
                        if (a.info.sortId > b.info.sortId) {
                            return -1;
                        }
                    });
                    member.color = userRoleArr[0].info.color;


                    // If the message was edited
                    if (member.editedMsgId != null) {

                        // Get Original message
                        let room = `${member.group}-${member.category}-${member.channel}`
                        let originalMsg = await getChatMessagesFromDb(room, 1, member.editedMsgId);
                        let originalMsgObj = JSON.parse(decodeFromBase64(originalMsg[0].message));

                        // Check if the user who wants to edit the msg is even the original author lol
                        if (originalMsgObj.id != member.id) {
                            Logger.warn(`Unauthorized user (${member.name} - ${member.id}) tried to edit another users message`);
                            return;
                        }

                        // Update the data for editing
                        member.editedMsgId = member.editedMsgId.replaceAll("msg-", "")
                        member.lastEdited = new Date().toISOString();

                        // Update back to original values of the message timestamp etc
                        // Else "Created Timestamp" and "Edited" is always the same
                        member.timestamp = originalMsgObj.timestamp;
                        member.messageId = originalMsgObj.editedMsgId;
                    }

                    member = getCastingMemberObject(member);

                    let memberMessageCount = serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel].msgCount + 1;

                    // Save the Chat Message to file
                    saveChatMessage(member, member.editedMsgId);

                    // Remove user from typing
                    var username = serverconfig.servermembers[member.id].name;
                    if (typingMembers.includes(username) == true) {
                        typingMembers.pop(username);
                    }
                    io.in(member.room).emit("memberTyping", typingMembers);

                    // Send message or update old one
                    if (member.editedMsgId == null) {
                        // New message
                        io.in(member.room).emit("messageCreate", member);


                        io.emit("markChannel", { channelId: parseInt(member.channel), count: memberMessageCount });
                    }
                    // emit edit event of msg
                    else {
                        io.in(member.room).emit("messageEdited", member);
                    }

                }
                else {
                    Logger.debug("Couldnt find message channel");

                    var msg = `We were unable to send the message because the 
                        channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                    sendMessageToUser(usersocket[member.id], JSON.parse(
                        `{
                            "title": "Channel not found",
                            "message": "${msg}",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "success",
                            "popup_type": "confirm"
                        }`));
                }
            }
            catch (err) {
                Logger.warn("Couldnt send message because room didnt exist");
                Logger.warn(`Group was ${member.group}`);
                Logger.warn(`Category  was ${member.category}`);
                Logger.warn(`Channel was ${member.channel}`);
                Logger.warn("Error");
                console.log(err);


                var msg = `We were unable to send the message because the 
                    channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                sendMessageToUser(usersocket[member.id], JSON.parse(
                    `{
                            "title": "Channel not found",
                            "message": "${msg}",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "success",
                            "popup_type": "confirm"
                        }`));
                return;
            }
        }
        else {
            Logger.warn("Cant send message because member id wasnt valid");
            Logger.warn("ID: " + member.id);
        }
    });

    function clearMessage(html, messageid) {
        html = html.replace(/<span[^>]*class=(['"])ql-cursor\1[^>]*>[\s\u200B-\u200D\uFEFF]*<\/span>/gi, "");

        html = html.replace(/[\u200B-\u200D\uFEFF]/g, "");

        const emptyInline = /<(?:span|em|strong|i|b|u)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|em|strong|i|b|u)>/gi;
        const emptyP = /<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>|<(?:span|em|strong|i|b|u)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|em|strong|i|b|u)>)*<\/p>/gi;

        let prev;
        do {
            prev = html;
            html = html.replace(emptyInline, "");
            html = html.replace(emptyP, "");
        } while (html !== prev);

        html = html.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>");

        if (!html || !html.replace(/<[^>]*>/g, "").trim()) {
            html = `<p id="msg-${messageid}"><br></p>`;
        }
        return html;
    }

}
