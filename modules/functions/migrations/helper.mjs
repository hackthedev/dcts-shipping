import {queryDatabase} from "../mysql/mysql.mjs";
import {backupSystem} from "../main.mjs";
import {migrateOldMessagesToNewMessageSystemWithoutEncoding} from "./messageMigration.mjs";
import {clearMemberBase64FromDb} from "./base64_fixer.mjs";
import {saveConfig, serverconfig, versionCode} from "../../../index.mjs";
import Logger from "@hackthedev/terminal-logger";
import {getAllChannels} from "../chat/helper.mjs";
import JSONTools from "@hackthedev/json-tools";

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
    let channelIdMigration = await getMigrationTask(`channelIdMigration`, true);
    if(channelIdMigration && channelIdMigration?.done === 0){

        try{
            await queryDatabase(
                `ALTER TABLE messages MODIFY COLUMN room VARCHAR(200);`, []
            )
        }
        catch (err){
            Logger.error(err);
            process.exit(0)
        }


        Logger.space(4)
        let channels = getAllChannels()
        for(let channelEntry of channels){

            // prepair some basic data that will be needed
            let channelGroupId = channelEntry.groupId;
            let channelCategoryId = channelEntry.categoryId;
            let channelId = channelEntry.channelId;

            let category = serverconfig.groups[channelGroupId].channels.categories[channelCategoryId];
            let configChannel = serverconfig.groups[channelGroupId].channels.categories[channelCategoryId].channel[channelId];

            // old vs new channel id!
            let oldChannelRoomId = `${channelGroupId}-${channelCategoryId}-${channelId}`
            let newChannelId = crypto.randomUUID()

            // skip channels that seem to be migrated
            if(String(channelId)?.length > 16){
                Logger.info(`Skipping Channel migration for '${configChannel.name}' to new id format from ${oldChannelRoomId} to ${newChannelId}`);
                continue;
            }

            // at this point we are going to migrate a channel!!
            Logger.info(`Migrating Channel '${configChannel.name}' to new id format from ${oldChannelRoomId} to ${newChannelId}`);

            // this is important. we need to update all messages in the database if we dont wanna lose any messages!!
            // we look for messages based on the current channel we're processing from the config.json files
            let messageRowsByChannel = await queryDatabase(
                `SELECT messageId,room,message FROM messages WHERE CHAR_LENGTH(room) < 16 AND room = ?`, [oldChannelRoomId]
            )

            // so for each message sent in that channel...
            if(messageRowsByChannel.length > 0){
                for(let i = 0; i < messageRowsByChannel.length; i++){

                    // we will parse the message json data from the database,
                    // then check for the stored room id inside the message,
                    // and we will rename it to the new channel.
                    let dbMessageRow = messageRowsByChannel[i];
                    let parsedMessageJson = JSONTools.tryParse(dbMessageRow.message);

                    // after the update we will store it again if the id isnt already the same
                    if(parsedMessageJson.room !== newChannelId){
                        parsedMessageJson.room = newChannelId

                        await queryDatabase(
                            `UPDATE messages SET message = ?, room = ? WHERE messageId = ?;`, [JSON.stringify(parsedMessageJson, 4, null), newChannelId, dbMessageRow.messageId]
                        )

                        Logger.info(`Updated Message ID ${dbMessageRow.messageId} to new room id ${newChannelId}`)
                    }
                }
            }

            // set new id and object and then delete old one.
            // if there is a rename function or something lemme know!
            if(category && channelEntry){
                category.channel[newChannelId] = configChannel;
                category.channel[newChannelId].id = newChannelId
                delete category.channel[channelId];

                await queryDatabase(
                    `UPDATE messages SET room = ? WHERE room = ? AND CHAR_LENGTH(room) < 5;`, [newChannelId, oldChannelRoomId]
                )
            }
        }

        await saveConfig(serverconfig)
        await completeMigrationTask(`channelIdMigration`)
        Logger.success("Channel ID Migration done!")
    }

    async function doBackup(){
        if(didBackup) return;
        didBackup = true;
        await backupSystem();
    }
}