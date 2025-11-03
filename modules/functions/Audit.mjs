import {queryDatabase} from "./mysql/mysql.mjs";
import Logger from "./logger.mjs";

export default class Auditlog{
    static async insert(text){
        if(!text){
            Logger.warn("Tried inserting empty text into audit log");
            return;
        }
        await queryDatabase(`INSERT INTO auditlog (text) VALUES(?)`, [text]);
    }

    static async getLogs(index = 0) {
        const limit = 250;
        return await queryDatabase(
            "SELECT * FROM auditlog ORDER BY datetime DESC LIMIT ? OFFSET ?",
            [limit, index]
        );
    }

}