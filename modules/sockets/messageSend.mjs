import {serverconfig, typingMembers, usersocket, xssFilters} from "../../index.mjs";
import {formatDateTime, hasPermission} from "../functions/chat/main.mjs";
import {saveChatMessage} from "../functions/io.mjs";
import Logger from "@hackthedev/terminal-logger"
import {
    checkMemberMute,
    checkRateLimit,
    copyObject,
    escapeHtml,
    generateId,
    getCastingMemberObject, removeFromArray,
    sanitizeInput,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {decodeFromBase64, getChatMessagesFromDb} from "../functions/mysql/helper.mjs";
import {signer} from "../../index.mjs"
import {decodeAndParseJSON, getMessageObjectById} from "./resolveMessage.mjs";

export function getMentionIdsFromText(text){
    return {
        userIds: [...text.matchAll(/&lt;@(\d+)&gt;/g)].map(m => m[1]),
        roleIds: [...text.matchAll(/&lt;!@(\d+)&gt;/g)].map(m => m[1]),
        channelIds: [...text.matchAll(/&lt;#@(\d+)&gt;/g)].map(m => m[1])
    }
}


export default (io) => (socket) => {
    // socket.on code here
    socket.on('messageSend', async function (member, response) {
        if (validateMemberId(member?.author?.id, socket, member?.token) === true) {

            // some new handling
            if(!member?.message) return response({error: "No message provided"})
            if(!member?.group) return response({error: "No group provided"})
            if(!member?.category) return response({error: "No category provided"})
            if(!member?.channel) return response({error: "No channel provided"})

            // check member mute
            let muteResult = checkMemberMute(socket, member);
            let muteText = "";

            if (muteResult?.timestamp) {
                if (new Date(muteResult.timestamp).getFullYear() == "9999") {
                    muteText = "muted permanently";
                } else {
                    muteText = `muted until <br>${formatDateTime(new Date(muteResult.timestamp))}`
                }
            }

            if (muteResult?.reason) {
                muteText += `<br><br>Reason:<br>${muteResult.reason}`
            }

            if (muteResult.result === true) {
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

                response({error: `You cant chat here! You have been ${muteText}`})
                return;
            }

            if (isNaN(member.group) === true) {
                Logger.debug("Group was not a number");
                return;
            }
            if (isNaN(member.channel) === true) {
                Logger.debug("Channel was not a number");
                return;
            }
            if (isNaN(member.category) === true) {
                Logger.debug("Category was not a number");
                return;
            }
            if (member.message.replaceAll(" ").length <= 0) {
                Logger.debug("Message is shorter than 1 charachter");
                return;
            }

            // if message is signed, verify the signature
            if(member?.sig !== null && member?.sig?.length > 10 && serverconfig.servermembers[member?.id]?.isVerifiedKey === true){
                let signCheckResult = await signer.verifyJson(member, serverconfig.servermembers[member?.id]?.publicKey);

                if(signCheckResult !== true){
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                                "title": "Message rejected!",
                                "message": "The signature in your message wasnt valid. The message was not sent",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "error",
                                "popup_type": "confirm"
                            }`));

                    response({error: "Message rejected! Signature wasnt valid!"})
                    return;
                }
            }

            if (!hasPermission(member.author?.id, ["sendMessages", "viewChannel"], member.channel, "all")) {
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

                response({error: "You cant chat here!"})

                return;
            }

            // Check if room exists
            try {
                if (serverconfig?.groups[member.group]?.channels?.categories[member.category]?.channel[member.channel] != null) {
                    let messageid = generateId(12);
                    member.timestamp = new Date().getTime();
                    member.messageId = messageid;
                    member.message = sanitizeInput(member.message);
                    member.reply = {
                        messageId: null,
                    }

                    // replace empty lines
                    member.message = clearMessage(member.message, messageid)

                    // create room key
                    let room = `${member.group}-${member.category}-${member.channel}`
                    member.room = room;

                    if (member.message.trim() === "" || member.message.trim().length === 0) {
                        console.log("Message was empty")
                        return;
                    }

                    // If the message was edited
                    if (member.editedMsgId != null) {
                        // Get Original message
                        let room = `${member.group}-${member.category}-${member.channel}`
                        let originalMsg = await getChatMessagesFromDb(room, 1, member.editedMsgId);
                        let originalMsgObj = decodeAndParseJSON(originalMsg[0].message);

                        // Check if the user who wants to edit the msg is even the original author lol
                        if (originalMsgObj.author.id !== member.author?.id) {
                            Logger.warn(`Unauthorized user (${member.name} - ${member.author?.id}) tried to edit another users message`);
                            return;
                        }

                        // Update the data for editing
                        member.lastEdited = new Date().getTime();

                        // Update back to original values of the message timestamp etc
                        // Else "Created Timestamp" and "Edited" is always the same
                        member.timestamp = originalMsgObj.timestamp;
                        member.messageId = member.editedMsgId // used for check below
                        member.reply.messageId = originalMsgObj?.reply?.messageId; // dont allow "unreplying"
                    }

                    // if the message is a reply
                    if(member?.replyMsgId != null) {
                        // Get Original message
                        let originalMsg = await getMessageObjectById(member.replyMsgId);
                        if(originalMsg?.message == null) return response({error: "Original message wasnt found!"});

                        // client will later fetch the original message.
                        // this way it'll always show the up-to-date
                        // message and we dont have to somehow check if the
                        // original message was updated etc..
                        member.reply = originalMsg.message;
                    }

                    // update some stuff for the message event
                    member = getCastingMemberObject(member);
                    member.author = getCastingMemberObject(serverconfig.servermembers[member.author?.id]);

                    // msgCount is incremented in saveChatMessage()

                    // Save the Chat Message to file
                    saveChatMessage(member, member.editedMsgId);

                    // Remove user from typing
                    var username = serverconfig.servermembers[member?.author?.id]?.name;
                    if (typingMembers.includes(username) === true) {
                        removeFromArray(typingMembers, username) // better
                    }

                    io.in(member.room).emit("memberTyping", typingMembers);

                    // Send message or update old one
                    if (member.editedMsgId == null) {
                        // New message.
                        // we will emit this to EVERYONE so we can better
                        // integrate the feature for showing a marker when
                        // new messages are created and check clientside
                        // if we are in the channel or not so we display it.
                        io.emit("messageCreate", member);
                    }
                    // emit edit event of msg
                    else {
                        io.in(member.room).emit("messageEdited", member);
                    }

                } else {
                    Logger.debug("Couldnt find message channel");

                    var msg = `We were unable to send the message because the 
                        channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                    sendMessageToUser(usersocket[member.author?.id], JSON.parse(
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
            } catch (err) {
                Logger.warn("Couldnt send message because room didnt exist");
                Logger.warn(`Group was ${member.group}`);
                Logger.warn(`Category  was ${member.category}`);
                Logger.warn(`Channel was ${member.channel}`);
                Logger.warn("Error");
                console.log(err);


                var msg = `We were unable to send the message because the 
                    channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                sendMessageToUser(usersocket[member.author?.id], JSON.parse(
                    `{
                            "title": "Channel not found",
                            "message": "${msg}",
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
        } else {
            Logger.warn("Cant send message because member id wasnt valid");
        }
    });

    function clearMessage(html, messageid) {
        html = html.replace(/<span[^>]*class=(['"])ql-cursor\1[^>]*>[\s\u200B-\u200D\uFEFF]*<\/span>/gi, "");
        html = html.replace(/[\u200B-\u200D\uFEFF]/g, "");

        const BRP_TOKEN = `__BRP_${messageid}__`;
        html = html.replace(/<p\b[^>]*>\s*(?:<br\s*\/?>\s*)<\/p>/gi, BRP_TOKEN);

        const emptyInline = /<(?:span|em|strong|i|b|u)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|em|strong|i|b|u)>/gi;
        const emptyP = /<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>|<(?:span|em|strong|i|b|u)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|em|strong|i|b|u)>)*<\/p>/gi;

        let prev;
        do {
            prev = html;
            html = html.replace(emptyInline, "");
            html = html.replace(emptyP, "");
        } while (html !== prev);

        html = html.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>");

        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const tokenRe = new RegExp(escapeRegExp(BRP_TOKEN), "g");

        const withoutBRP = html.replace(tokenRe, "");
        const hasImage = /<img\b[^>]*>/i.test(withoutBRP);
        const hasText = !!withoutBRP
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;|\s/gi, "")
            .trim();

        if (!hasImage && !hasText) {
            return "";
        }

        const trailingTokensRe = new RegExp("(?:\\s*" + escapeRegExp(BRP_TOKEN) + ")+\\s*$");
        html = html.replace(trailingTokensRe, "");

        html = html.replace(tokenRe, "<p><br></p>");

        return html;
    }


}
