import {validateMemberId} from "../../functions/main.mjs";
import {queryDatabase} from "../../functions/mysql/mysql.mjs";
import {getInboxMessages} from "../../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('fetchInboxMessages', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){
            response({ error: null, items:  await getInboxMessages({
                    memberId: member.id,
                    index: member?.index,
                    inboxId: member?.inboxId,
                    onlyUnread: member?.onlyUnread
                }) })
        }
    });
}
