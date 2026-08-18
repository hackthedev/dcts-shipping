import { usersocket, serverconfig, xssFilters } from "../../index.mjs";
import {hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import { leaveAllRooms } from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setRoom', async function (member) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            leaveAllRooms(socket, member.id);

            var room = member.room;
            var group = resolveGroupByChannelId(room);
            var category = resolveCategoryByChannelId(room);
            var channel = room;

            // annoying
            if (channel === "null" || category === "null" || group === "null" || !channel || !category || !group) console.warn("Cant join room");

            try {
                // If the channel exists
                if (serverconfig.groups?.[group]?.channels?.categories?.[category]?.channel?.[channel] != null) {

                    // If its a text channel
                    if (serverconfig.groups[group].channels.categories[category].channel[channel].type === "text") {

                        if (!await hasPermission(member.id, "viewChannel", channel)) {
                            sendMessageToUser(socket.id, JSON.parse(
                                `{
                                    "title": "Access denied",
                                    "message": "You're not allowed to talk in this channel",
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

                        // Permission already checked above for text on default
                        socket.join(channel);
                        socket.data.room = channel
                    }
                    // If its a voice channel
                    else if (serverconfig.groups[group].channels.categories[category].channel[channel].type === "voice") {

                        // If user can use VC
                        if (!await hasPermission(member.id, "useVOIP", channel)) {
                            sendMessageToUser(socket.id, JSON.parse(
                                `{
                                    "title": "Access denied",
                                    "message": "You're not allowed to talk in this channel",
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

                        socket.join(channel);
                        socket.data.room = channel
                    }
                    else{
                        socket.join(channel);
                        socket.data.room = channel
                    }
                }
                else{
                    Logger.warn("Channel cant be joined cauz it wasnt found")
                }
            }
            catch (error) {

                try {
                    socket.leave(escapeHtml(member.channel));
                    socket.data.room = null;
                }
                catch (ww) {
                    console.log(ww)
                }

                Logger.error(`Couldnt find room ${member.channel}`);
                Logger.error(error);
                return;
            }
        }
        else {
            Logger.error(`Couldnt set room because token or id didnt match`.red);
            Logger.error(`Server's User Id ${serverconfig.servermembers[member.id].id}`);
            Logger.error(`User's User Id ${member.id}`);
            Logger.error(`Server's User Token ${serverconfig.servermembers[member.id].token}`);
            Logger.error(`User's User Token ${member.token}`);


            sendMessageToUser(usersocket[member.id], JSON.parse(
                `{
                    "title": "Couldnt process channel join request",
                    "message": "User ID or Token does not match. Known issue, will be fixed.",
                    "buttons": {
                        "0": {
                            "text": "Ok",
                            "events": "window.location.reload()"
                        }
                    },
                    "type": "error",
                    "popup_type": "confirm"
                }`));
        }
    });
}
