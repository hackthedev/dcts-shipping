import {addBan} from "../ban-system/helpers.mjs";
import {serverconfig} from "../../../index.mjs";

export async function autobanXSS(identifier){
    console.log("checking ban")
    if(serverconfig.serverinfo.moderation.bans.allowXSSTesting === true) return;
    if(!identifier) throw new Error("No identifier set")

    await addBan({
        identifier,
        reason: "XSS / Unallowed Vulnerability Testing",
    })
    console.log("banned")
}