import {validateMemberId} from "../../functions/main.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger";
import {renderRoomCharts} from "../../functions/anti-spam/charts.mjs";




export default (io) => (socket) => {

    // socket.on code here
    socket.on('getRoomCharts', async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true) {

            if(!member?.room) return response({ error: "No room argument passed." })

            if (hasPermission(member.id, "manageRateSettings")) {
                response({ error: null, paths: await renderRoomCharts(member.room) });
            }
            else {
                response({ error: "You're not allowed to manage reports" });
            }
        }
    });
}
