// Example Imports
import Logger from "../../../modules/functions/logger.mjs";
import {handleTerminalCommands, updateFunction_Main} from "../../../modules/functions/main.mjs";
import {Addon} from "../../../modules/functions/addon.mjs";

// Example Code
Logger.info("Content")
Logger.success("Content");
Logger.error("Content")

updateFunction_Main("handleTerminalCommands", Addon.createPatchedSource(
    handleTerminalCommands,
    'try {',
    'below',
    () => {
        if (command === 'ping') {
            console.log("pong")
            return;
        }
    }
))
