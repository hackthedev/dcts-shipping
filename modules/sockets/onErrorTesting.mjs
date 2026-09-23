import {io} from "../functions/init/sockets.mjs";
import {debugmode} from "../functions/init/general.mjs";

export function emitErrorToTestingClient(err){
    if(!debugmode) return;
    if(!io) return;

    io.emit("onErrorTesting", {
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    });
}

export default (io) => (socket) => {
}