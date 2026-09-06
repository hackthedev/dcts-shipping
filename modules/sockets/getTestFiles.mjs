import {debugmode} from "../../index.mjs";
import fs from "fs";


export default (io) => (socket) => {
    // socket.on code here

    socket.on('getTestFiles', async function(member, response) {
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
