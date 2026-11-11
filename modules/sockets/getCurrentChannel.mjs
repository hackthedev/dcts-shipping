import { usersocket } from "../../index.mjs";
import {hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";
import {response} from "express";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getCurrentChannel', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {
            if(!member?.channel) return response ? response({ error: "Missing channel id"}) : null;

            let category = resolveCategoryByChannelId(member.channel);
            let group = resolveGroupByChannelId(member.channel);

            try {
                if (await hasPermission(member.id, "viewChannel", member.channel) === true) {
                    io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[group].channels.categories[category].channel[member.channel]);
                }
            }
            catch {
                io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[group]);
            }
        }
    });
}
