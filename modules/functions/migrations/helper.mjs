import {queryDatabase} from "../mysql/mysql.mjs";
import {backupSystem} from "../main.mjs";
import Logger from "@hackthedev/terminal-logger";
import {saveConfig, serverconfig} from "../init/config.mjs";

export async function createMigrationTask(name){
    return await queryDatabase("INSERT IGNORE INTO migrations (migration_name) VALUES (?)", [name])
}

export async function completeMigrationTask(name){
    await queryDatabase("UPDATE migrations SET done=1 WHERE migration_name = ?", [name])
}

export async function getMigrationTask(name, createIfNull = false){
    let resultRow = await queryDatabase("SELECT * FROM migrations WHERE migration_name = ?", [name])

    // create if option was set and return it
    if(resultRow.length === 0 && createIfNull === true){
        await createMigrationTask(name);
        resultRow = await queryDatabase("SELECT * FROM migrations WHERE migration_name = ?", [name])
    }

    if(resultRow.length > 0) return resultRow[0];
}

export async function checkMigrations(){
    let didBackup = false;

    // migrate all channels and messages
    /*
    let configUrlFix = await getMigrationTask(`config_url_fix`, true);
    if(configUrlFix && configUrlFix?.done === 0){
        await saveConfig(serverconfig)
        await completeMigrationTask(`config_url_fix`)
    }

     */

    async function doBackup(){
        if(didBackup) return;
        didBackup = true;
        await backupSystem();
    }
}