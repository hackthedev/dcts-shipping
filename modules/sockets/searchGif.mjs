import { searchGif, validateMemberId} from "../functions/main.mjs";
import {stripHTML} from "../functions/sanitizing/functions.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('searchGif', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if(member?.search) member.search = stripHTML(member?.search)

            let searchResponse = await searchGif(member?.search ?? null);
            response({error: (searchResponse?.error ?? null), gifs: searchResponse.gifs})
        }
    });
}
