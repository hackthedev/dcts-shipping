import {db} from "../init/database.mjs";

export async function queryDatabase(query, params, retryCount = 3) {
    return await db.queryDatabase(query, params, retryCount);
}

export async function checkAndCreateTable(table) {
    return await db.checkAndCreateTable(table);
}