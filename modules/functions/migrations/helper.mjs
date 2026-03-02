import {queryDatabase} from "../mysql/mysql.mjs";
import {backupSystem} from "../main.mjs";
import {migrateOldMessagesToNewMessageSystemWithoutEncoding} from "./messageMigration.mjs";
import {clearMemberBase64FromDb} from "./base64_fixer.mjs";
import {saveConfig, serverconfig, versionCode} from "../../../index.mjs";
import Logger from "@hackthedev/terminal-logger";

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

    // messages room change
    migrationTask = await getMigrationTask("messagesRoomTypeChange", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()
        await queryDatabase(
            "ALTER TABLE messages MODIFY COLUMN room VARCHAR(25) NOT NULL"
        );
        await completeMigrationTask("messagesRoomTypeChange")
    }

    // beta to main update
    migrationTask = await getMigrationTask("mainMerge", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()

        try{
            await queryDatabase("ALTER TABLE `messages` ADD UNIQUE KEY `messageId` (`messageId`)", []);
            await queryDatabase("ALTER TABLE `members` ADD COLUMN `country_code` VARCHAR(50) DEFAULT NULL", []);
            await queryDatabase("ALTER TABLE `members` MODIFY `token` VARCHAR(255)", []);
            await queryDatabase("ALTER TABLE `members` MODIFY `name` VARCHAR(100) NOT NULL DEFAULT 'User'", []);
            await queryDatabase("ALTER TABLE `members` MODIFY `password` TEXT DEFAULT NULL", []);
            await queryDatabase("ALTER TABLE `dms_participants` ADD KEY `memberId` (`memberId`)", []);
            await queryDatabase("ALTER TABLE `url_cache` ADD UNIQUE KEY `url` (`url`)", []);
            await queryDatabase("ALTER TABLE `content_reads` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT", []);
            await queryDatabase("ALTER TABLE `message_logs` MODIFY `id` INT(100) NOT NULL AUTO_INCREMENT", []);
        }catch(err){
            Logger.error("DB Migration failed and wont be retried!")
            Logger.error(err);
            await completeMigrationTask("mainMerge")
        }

        await completeMigrationTask("mainMerge")
    }

    // dm participant stuff
    migrationTask = await getMigrationTask("dmParticipants", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()

        try{
            await queryDatabase(`ALTER TABLE dms_participants DROP PRIMARY KEY`, []);
            await queryDatabase(`ALTER TABLE dms_participants ADD PRIMARY KEY (threadId, memberId)`, []);
            await queryDatabase(`ALTER TABLE dms_participants ADD KEY memberId (memberId)`, []);
        }catch(err){
            Logger.error("DB Migration failed and wont be retried!")
            Logger.error(err);
            await completeMigrationTask("dmParticipants")
        }

        await completeMigrationTask("dmParticipants")
    }

    // fix 1erb45 ids to 123254345
    migrationTask = await getMigrationTask("fixPRIds", true);
    if(migrationTask && migrationTask?.done === 0){
        await doBackup()

        for (const [groupKey, group] of Object.entries(serverconfig.groups)) {
            group.info.id = String(groupKey);

            const categories = group.channels?.categories;
            if (!categories) continue;

            for (const [catKey, cat] of Object.entries(categories)) {
                cat.info.id = String(catKey);

                if (!cat.channel) continue;

                for (const [chKey, ch] of Object.entries(cat.channel)) {
                    ch.id = String(chKey);
                }
            }
        }

        await saveConfig(serverconfig);
        await completeMigrationTask("fixPRIds")
    }

    async function doBackup(){
        if(didBackup) return;
        didBackup = true;
        await backupSystem();
    }
}