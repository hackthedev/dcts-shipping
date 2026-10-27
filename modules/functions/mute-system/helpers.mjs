import {queryDatabase} from "../mysql/mysql.mjs";
import DCTS from "../../../sdk/v1/backend/dcts_sdk.mjs";

export async function addMute({
                                 identifier,
                                 issuerId = "system",
                                 reason = "",
                                 until = -1,
                             } = {}){
    if(!identifier) throw new Error("Identifier was undefined!")

    let result = await queryDatabase(
        `INSERT INTO mutes (identifier, issuerId, reason, until)
               VALUES (?,?,?,?) 
                ON DUPLICATE KEY UPDATE issuerId=VALUES(issuerId), reason=VALUES(reason), until=VALUES(until)
    `, [identifier, issuerId, (reason).length === 0 ? null : reason, until])

    return result?.affectedRows >= 0;
}

export async function removeMute(identifier){
    if(!identifier) throw new Error("Identifier was undefined!")

    let result = await queryDatabase(
        `DELETE FROM mutes WHERE identifier = ? OR identifier = ?
    `, [identifier, identifier])

    return result?.affectedRows >= 0;
}

export async function getMute(...identifiers){
    identifiers = identifiers.filter(id => id !== undefined && id !== null);
    if(!identifiers.length) throw new Error("Identifier was undefined!");

    const placeholders = identifiers.map(() => "?").join(",");
    const result = await queryDatabase(
        `SELECT * FROM mutes WHERE identifier IN (${placeholders})`,
        identifiers
    );

    return result.length ? result : null;
}

export async function isMemberMuted(...identifiers) {
    identifiers = identifiers.filter(id => id !== undefined && id !== null);
    if(!identifiers.length) throw new Error("Identifier was undefined!");
    let muteObj = await getMute(...identifiers);

    if(!muteObj){
        return {
            result: false
        };
    }
    else{
        return {
            result: true,
            timestamp: muteObj.until,
            reason: muteObj.reason
        }
    }
}