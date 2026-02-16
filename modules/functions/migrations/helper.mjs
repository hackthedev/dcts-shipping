import {queryDatabase} from "../mysql/mysql.mjs";
import {backupSystem} from "../main.mjs";
import {migrateOldMessagesToNewMessageSystemWithoutEncoding} from "./messageMigration.mjs";
import {clearMemberBase64FromDb} from "./base64_fixer.mjs";
import Logger from "@hackthedev/terminal-logger"
import {versionCode} from "../../../index.mjs";

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
        resultRow = await createMigrationTask(name);
    }

    if(resultRow.length > 0) return resultRow[0];
}


export async function checkMigrations(){
    let didBackup = false;

    // auto backup on server update
    let migrationTask = await getMigrationTask(`update_${versionCode}`, true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()
        await completeMigrationTask(`update_${versionCode}`)
        didBackup = false; // intentionally make a new backup after updates and migration
    }

    // new message system migration
    migrationTask = await getMigrationTask("migrateNewMessages", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()
        await migrateOldMessagesToNewMessageSystemWithoutEncoding()
        await completeMigrationTask("migrateNewMessages")
    }

    migrationTask = await getMigrationTask("clearMemberBase64FromDb", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()
        await clearMemberBase64FromDb()
        await completeMigrationTask("clearMemberBase64FromDb")
    }

    // inox id error
    migrationTask = await getMigrationTask("fixAutoIncrementInMessageLogs", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()
        await queryDatabase(
            "ALTER TABLE `message_logs` MODIFY COLUMN `id` INT(100) NOT NULL AUTO_INCREMENT",
            []
        );
        await completeMigrationTask("fixAutoIncrementInMessageLogs")
    }

    async function doBackup(){
        if(didBackup) return;
        didBackup = true;
        await backupSystem();
    }
}