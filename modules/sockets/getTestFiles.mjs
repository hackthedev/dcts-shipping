import {debugmode,fs, serverconfig, xssFilters} from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getTestFiles', function (member, response) {
        // some code
        if(debugmode === true){
            const testFolder = './public/testing/tests';
            let files = fs.readdirSync(testFolder)
            response({ error: null, files })
        }
        else{
            response({ error: "Only available in debug mode", files: null })
        }
    });
}
