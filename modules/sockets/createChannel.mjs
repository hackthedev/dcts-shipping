import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, generateId, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('createChannel', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)
            member.category = xssFilters.inHTMLData(member.category)
            member.value = xssFilters.inHTMLData(member.value)
            member.type = xssFilters.inHTMLData(member.type)

            if (!await hasPermission(member.id, "manageChannels")) {
                response({ msg: "You are not allowed to create a channel", type: "error", error: "Missing permissions to create channel" })
                return;
            }

            const group = serverconfig.groups?.[member.group];
            if (!group) {
                response({ msg: "Couldnt create channel", type: "error", error: "Invalid group" })
                return;
            }

            const category = group.channels?.categories?.[member.category];
            if (!category) {
                response({ msg: "Couldnt create channel", type: "error", error: "Invalid category" })
                return;
            }

            const channelName = escapeHtml(String(member.value || "").trim());
            if (!channelName) {
                response({ msg: "Channel name is required", type: "error", error: "Missing channel name" })
                return;
            }

            if (!["text", "voice"].includes(member.type)) {
                response({ msg: "Invalid channel type", type: "error", error: "Invalid channel type" })
                return;
            }

            try {
                var channelId = generateId(4);

                category.channel[channelId] = {
                    id: channelId,
                    name: channelName,
                    type: member.type,
                    description: "Default Channel Description",
                    sortId: 0,
                    permissions: {
                        0: {
                            viewChannelHistory: 0,
                            readMessages: 0,
                            sendMessages: 0,
                            viewChannel: -1
                        }
                    }
                };

                saveConfig(serverconfig);
                io.emit("receiveChannelTree", getChannelTree(member));
                response({ msg: "Channel created successfully", type: "success" })
            }
            catch (e) {
                Logger.error("Couldnt create channel");
                Logger.error(e);
                response({ msg: "Couldnt create channel", type: "error", error: "Unexpected error creating channel" })
            }
        }
    });
}
