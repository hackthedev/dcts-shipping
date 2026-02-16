import {queryDatabase} from "../mysql/mysql.mjs";
import {sleep} from "../main.mjs";
import {decodeFromBase64, saveChatMessageInDb, saveMemberToDB} from "../mysql/helper.mjs";
import {decodeAndParseJSON} from "../../sockets/resolveMessage.mjs";
import {serverconfig} from "../../../index.mjs";

export async function clearBase64FromDatabase(){
    let msgIds = await queryDatabase("SELECT messageId FROM messages");

    for(let msgRow of msgIds){
        let msgId = msgRow.messageId;
        let messageRow = await queryDatabase("SELECT * FROM messages WHERE messageId = ?", [msgId]);
        let messageRaw = messageRow[0];

        if(messageRaw){
            try{
                let decodedMessage = decodeAndParseJSON(messageRaw.message)
                if(!decodedMessage?.author?.id || Object.keys(decodedMessage.author).length === 0){
                    decodedMessage.author = {
                        id: decodedMessage.id
                    }
                }

                if(decodedMessage?.icon) delete decodedMessage.icon;
                if(decodedMessage?.banner) delete decodedMessage.banner;
                if(decodedMessage?.name) delete decodedMessage.name;
                if(decodedMessage?.color) delete decodedMessage.color;
                await saveChatMessageInDb(decodedMessage)

                console.log(decodedMessage)
            }
            catch{

            }
        }

        await sleep(200)
    }
}

export async function clearMemberBase64FromDb(){
    let memberIdsRow = await queryDatabase("SELECT id FROM members");

    for(let memberRow of memberIdsRow){
        let memberId = memberRow.id;
        if(!serverconfig.servermembers.hasOwnProperty(memberId)) continue;

        if(!serverconfig.servermembers[memberId]?.icon) continue;
        if(!serverconfig.servermembers[memberId]?.banner) continue;

        if(serverconfig.servermembers[memberId].icon.startsWith("data:image")) serverconfig.servermembers[memberId].icon = "";
        if(serverconfig.servermembers[memberId].banner.startsWith("data:image")) serverconfig.servermembers[memberId].banner = "";

        await saveMemberToDB(memberId, serverconfig.servermembers[memberId])
    }
}