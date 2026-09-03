// create sql pool
import {queryDatabase} from "../mysql/mysql.mjs";
import {setLongInterval, toSeconds} from "../main.mjs";
import Logger from "../logger.mjs";
import {saveConfig, serverconfig} from "./config.mjs";
import dSyncSql from "@hackthedev/dsync-sql"

export let db = null;

export function processDbEnvData() {
    // accept env vars and if present save them in the config
    let dbHost = process.env.DATABASE_HOST || process.env.DB_HOST;
    let dbUser = process.env.DATABASE_USER || process.env.DB_USER;
    let dbPass = process.env.DATABASE_PASSWORD || process.env.DB_PASS;
    let dbName = process.env.DATABASE_NAME || process.env.DB_NAME;

    if (dbHost) serverconfig.serverinfo.sql.host = dbHost;
    if (dbUser) serverconfig.serverinfo.sql.username = dbUser;
    if (dbPass) serverconfig.serverinfo.sql.password = dbPass;
    if (dbName) serverconfig.serverinfo.sql.database = dbName;

    // do not await this, else its gonna take a while
    saveConfig(serverconfig);
}

export async function runDbTask(task) {
    if (task.enabled !== true) return;

    try {
        Logger.log("DB TASK", `[${task.name}] starting...`, Logger.colors.fgCyan);
        await queryDatabase(task?.query);
        Logger.log("DB TASK", `[${task.name}] done.`, Logger.colors.fgGreen);
    } catch (err) {
        Logger.log("DB TASK", `[${task.name}] error:`, Logger.colors.fgRed);
        Logger.log("DB TASK", err, Logger.colors.fgRed);
    }
}

export function scheduleDbTasks(tasks) {
    for (const task of tasks) {
        const ms = task.interval * 1000; // second to ms
        setLongInterval(() => runDbTask(task), ms);
    }
}

export async function waitForTable(table, interval = 1000) {
    while (true) {
        const result = await queryDatabase(
            `SELECT TABLE_NAME FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = ?`,
            [table]
        );

        if (result?.length) {
            return;
        }

        Logger.info(`${table} does not exist yet, retrying...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

export async function setupDbConnection(){
    try{
        let dbConnectionTest = await dSyncSql.testConnection({
            host: serverconfig.serverinfo.sql.host,
            port: serverconfig.serverinfo.sql.port,
            username: serverconfig.serverinfo.sql.username,
            password: serverconfig.serverinfo.sql.password,
            database: serverconfig.serverinfo.sql.database,
        })

        // if connection is invalid show it
        if(!dbConnectionTest){
            Logger.error("Database credentials are wrong!")
            Logger.error(serverconfig.serverinfo.sql)
            return;
        }

        // init database connection
        db = new dSyncSql({
            host: serverconfig.serverinfo.sql.host,
            port: serverconfig.serverinfo.sql.port,
            user: serverconfig.serverinfo.sql.username,
            password: serverconfig.serverinfo.sql.password,
            database: serverconfig.serverinfo.sql.database,
            waitForConnections: true,
            connectionLimit: serverconfig.serverinfo.sql.connectionLimit,
            queueLimit: 0,
        });

        await db.ready;

        Logger.info("Checking and waiting for database connection...");
        Logger.info("If it takes too long check the data inside the config.json file");
        Logger.info("and make sure the database is running and accessible.");
        await db.waitForConnection();
        Logger.success("Connection established!");
        Logger.space();

        // Create a connection pool if sql is enabled
        // SQL Database Structure needed
        // it will create everything if missing (except database)
        // +1 convenience
        const tables = [
            {
                name: "dm_rooms",
                columns: [

                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "roomId", type: "varchar(200) NOT NULL UNIQUE KEY"},
                    {name: "title", type: "varchar(204) NOT NULL DEFAULT 'New Chat'"},
                    {name: "creatorId", type: "varchar(20) NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ]
            },
            {
                name: "dm_reads",
                columns: [
                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "memberId", type: "varchar(204) NOT NULL"},
                    {name: "targetId", type: "varchar(100) NOT NULL"}, // roomId oder channelId
                    {name: "lastReadAt", type: "bigint NOT NULL DEFAULT 0"},
                ],
                keys: [
                    {name: "UNIQUE KEY", type: "unique_member_target (memberId, targetId)"},
                    {name: "KEY", type: "idx_memberId (memberId)"},
                ]
            },
            {
                name: "dm_room_participants",
                columns: [
                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "roomId", type: "varchar(200) NOT NULL"},
                    {name: "memberId", type: "varchar(204) NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ],
                keys: [
                    {name: "UNIQUE KEY", type: "unique_room_member (roomId, memberId)"},
                    {name: "KEY", type: "idx_memberId (memberId)"},
                    {name: "KEY", type: "idx_roomId (roomId)"},
                ]
            },
            {
                name: "dms",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "roomId", type: "varchar(200) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "message", type: "longtext NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "editedAt", type: "bigint NULL"},
                ]
            },
            {
                name: "messages",
                columns: [
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "room", type: "varchar(200) NOT NULL"},
                    {name: "message", type: "longtext NOT NULL"},
                    {
                        name: "createdAt",
                        type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)",
                    },
                    {
                        name: "editedAt",
                        type: "bigint DEFAULT NULL",
                    },
                ]
            },
            {
                name: "message_reactions",
                columns: [
                    {name: "cid", type: "varchar(500) NOT NULL UNIQUE KEY"},
                    {name: "reactionId", type: "int(100) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "messageId", type: "varchar(100) NOT NULL"},
                    {name: "emojiHash", type: "longtext NOT NULL"},
                    {name: "memberId", type: "varchar(100) NOT NULL"},
                    {name: "react_timestamp", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "ip_cache",
                columns: [
                    {name: "ip", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "data", type: "longtext NOT NULL"},
                    {name: "last_sync", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "cache",
                columns: [
                    {name: "rowId", type: "int(12) NOT NULL AUTO_INCREMENT PRIMARY KEY"},
                    {name: "identifier", type: "varchar(255) NOT NULL UNIQUE KEY"},
                    {name: "type", type: "varchar(255) NOT NULL"},
                    {name: "data", type: "longtext NOT NULL"},
                    {name: "last_update", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "created", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "migrations",
                columns: [
                    {name: "migration_name", type: "varchar(100) NOT NULL"},
                    {name: "done", type: "int(10) NOT NULL DEFAULT 0"},
                ],
                keys: [{name: "UNIQUE KEY", type: "migration_name (migration_name)"}],
            },
            {
                name: "message_logs",
                columns: [
                    {name: "id", type: "int(100) NOT NULL PRIMARY KEY UNIQUE KEY AUTO_INCREMENT"},
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL"},
                    {name: "room", type: "text NOT NULL"},
                    {name: "message", type: "longtext NOT NULL"},
                ]
            },
            {
                name: "url_cache",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY UNIQUE KEY AUTO_INCREMENT"},
                    {name: "url", type: "longtext NOT NULL UNIQUE KEY"},
                    {name: "media_type", type: "text NOT NULL"},
                ]
            },
            {
                name: "reports",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "reportCreator", type: "longtext NOT NULL"},
                    {name: "reportedUser", type: "longtext NOT NULL"},
                    {name: "reportType", type: "text NOT NULL"},
                    {name: "reportData", type: "longtext NULL"},
                    {name: "reportNotes", type: "longtext NULL"},
                    {name: "reportStatus", type: "varchar(100) NOT NULL DEFAULT 'pending'"},
                ],
            },
            {
                name: "auditlog",
                columns: [
                    {name: "text", type: "longtext NOT NULL"},
                    {name: "datetime", type: "datetime NOT NULL DEFAULT CURRENT_TIMESTAMP"},
                ],
            },
            {
                name: "members",
                columns: [
                    {name: "rowId", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT" },
                    {name: "id", type: "varchar(100) NOT NULL UNIQUE"},
                    {name: "token", type: "varchar(255)"},
                    {name: "onboarding", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "loginName", type: "varchar(100)"},
                    {name: "name", type: "varchar(100) NOT NULL DEFAULT 'User'"},
                    {name: "nickname", type: "varchar(100) DEFAULT NULL"},
                    {name: "country_code", type: "varchar(50) DEFAULT NULL"},
                    {name: "status", type: "text DEFAULT ''"},
                    {name: "aboutme", type: "text DEFAULT ''"},
                    {name: "icon", type: "longtext DEFAULT ''"},
                    {name: "banner", type: "longtext DEFAULT ''"},
                    {name: "card", type: "longtext DEFAULT ''"},
                    {name: "joined", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "isOnline", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "lastOnline", type: "bigint DEFAULT 0"},
                    {name: "isBanned", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "isMuted", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "password", type: "text DEFAULT NULL"},
                    {name: "publicKey", type: "text DEFAULT ''"},
                    {name: "type", type: "varchar(500) DEFAULT NULL"},
                    {name: "isVerifiedKey", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "pow", type: "text DEFAULT ''"},
                ]
            },
            {
                name: "bans",
                columns: [
                    {name: "rowId", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT" },
                    {name: "memberId", type: "varchar(100) NOT NULL UNIQUE"},
                    {name: "publicKey", type: "text NULL UNIQUE"},
                    {name: "issuerId", type: "varchar(100) NOT NULL"},
                    {name: "ip", type: "varchar(100) DEFAULT NULL"},
                    {name: "reason", type: "varchar(500) DEFAULT NULL"},
                    {name: "created", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "until", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ]
            },
        ];

        const dbTasks = [
            {
                name: "Purge Old Message Logs",
                enabled: serverconfig.serverinfo.reports.enabled,
                interval: toSeconds("12 hours"),
                query: `
                    DELETE
                    ml
                        FROM message_logs ml
                        LEFT JOIN messages m
                        ON m.messageId = ml.messageId
                        LEFT JOIN reports r
                        ON JSON_UNQUOTE(JSON_EXTRACT(r.reportData, '$.messageId')) = ml.messageId
                        WHERE m.messageId IS NULL
                        AND r.id IS NULL;
                `,
            },
        ];

        // create missing database schema
        for (const table of tables) {
            await db.checkAndCreateTable(table);
        }

        // then wait for these tables to exist to avoid errors
        const criticalTables = ["members", "messages", "cache", "migrations", "message_logs", "reports"];
        for (const t of criticalTables) {
            await waitForTable(t);
        }

        // after the tables exist etc we will fire up our awesome new job(s)
        scheduleDbTasks(dbTasks);
    }
    catch(err){
        console.error(err);
    }
}