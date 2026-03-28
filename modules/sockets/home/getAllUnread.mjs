import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import {getUnreadDms} from "./dms/rooms.mjs";

export default (io) => (socket) => {
    socket.on('getAllUnread', async function (member, response) {
        try {
            if (await validateMemberId(member.id, socket, member?.token) !== true) {
                return response?.({ type: 'error', msg: 'unauthorized' });
            }

            let unreads = await getUnreadDms(member.id);

            let total = 0;
            for (let roomId in unreads) total += unreads[roomId];

            response?.({ type: 'success', unreads, total });
        } catch (err) {
            Logger.error(err);
            response?.({ type: 'error', msg: 'getAllUnread failed' });
        }
    });
}