import { saveConfig, serverconfig } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { generateId, validateMemberId } from "../functions/main.mjs";
import { stripHTML } from "../functions/sanitizing/functions.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('createChannel', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            member.id = stripHTML(member?.id)?.trim()
            member.token = stripHTML(member?.token)?.trim()
            member.group = stripHTML(member?.group)?.trim()
            member.category = stripHTML(member?.category)?.trim()
            member.value = stripHTML(member?.value)?.trim()
            member.type = stripHTML(member?.type)?.trim()

            if (!await hasPermission(member.id, "manageChannels")) return response({ error: "Missing permissions to create channel" })

            const group = serverconfig.groups?.[member.group];
            if (!group) return response({ error: "Couldnt create channel: invalid group" })

            const category = group.channels?.categories?.[member.category];
            if (!category) return response({ error: "Couldnt create channel: missing category" })

            const channelName = stripHTML(member.value);
            if (!channelName) return response({ error: "Couldnt create channel: missing channel name" })

            if (!["text", "voice"].includes(member.type)) return response({ error: "Couldnt create channel: invalid channel type" })

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
                response({ error: null })
            }
            catch (e) {
                Logger.error("Couldnt create channel");
                Logger.error(e);
                response({ error: "Couldnt create channel: unexpected error" })
            }
        }
    });
}
