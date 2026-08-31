import fs from "fs"
import {serverconfig} from "../init/config.mjs";

export async function checkMemberMigration(force = false){
    if(serverconfig?.servermembers){
        if(!fs.existsSync("./members.json") || force === true){
            // backup members!!!
            fs.writeFileSync("./members.json", JSON.stringify(serverconfig.servermembers));
        }
    }
}