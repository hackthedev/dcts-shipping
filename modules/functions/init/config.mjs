/*
    Holy Server config file.
    needs to be above the imports else serverconfig will be undefined
 */
import JSONTools from "@hackthedev/json-tools"
import fs from "fs";
import {checkObjectKeys} from "../main.mjs";
export let configPath = "./configs/config.json";

export var serverconfig = fs.existsSync(configPath) ? JSONTools.tryParse(fs.readFileSync(configPath, {encoding: "utf-8"})) : {};
checkConfigAdditions();


export function checkConfigAdditions() {


    checkObjectKeys(serverconfig, "serverinfo.messenger.defaultFileUploadLimit", 10)
    checkObjectKeys(serverconfig, "serverinfo.dms.maxParticipants", 10)

    // recreating the config example minimum base so that copying isnt needed anymore
    checkObjectKeys(serverconfig, "serverinfo.name", "Default Server")
    checkObjectKeys(serverconfig, "serverinfo.description", "")
    checkObjectKeys(serverconfig, "serverinfo.port", 2052)
    checkObjectKeys(serverconfig, "serverinfo.setup", 0)
    checkObjectKeys(serverconfig, "serverinfo.maxUploadStorage", 1024)
    checkObjectKeys(serverconfig, "serverinfo.rateLimit", 512)
    checkObjectKeys(serverconfig, "serverinfo.dropInterval", 5)
    //
    checkObjectKeys(serverconfig, "serverinfo.useCloudflareImageCDN", "")
    checkObjectKeys(serverconfig, "serverinfo.cfAccountId", "")
    checkObjectKeys(serverconfig, "serverinfo.cfAccountToken", "")
    checkObjectKeys(serverconfig, "serverinfo.cfHash", "")
    //
    checkObjectKeys(serverconfig, "ipblacklist", [])
    checkObjectKeys(serverconfig, "banlist", {})
    checkObjectKeys(serverconfig, "mutelist", {})
    //
    checkObjectKeys(serverconfig, "serverroles", {
        "0": {
            "info": {
                "id": "0",
                "name": "Member",
                "icon": null,
                "color": "#FFFFFF",
                "deletable": 0,
                "sortId": 1,
                "displaySeperate": 1,
                "hasRole": 1
            },
            "permissions": {
                "readMessages": 1,
                "sendMessages": 1,
                "uploadFiles": 1,
                "redeemKey": 1,
                "maxUpload": "10",
                "manageChannels": 0,
                "viewChannelHistory": 1,
                "createReports": 1
            },
            "members": [],
            "token": []
        },
        "1": {
            "info": {
                "id": "1",
                "name": "Offline",
                "icon": null,
                "color": "#7C808A",
                "deletable": 0,
                "sortId": 0,
                "displaySeperate": 1,
                "hasRole": 0
            },
            "permissions": {},
            "members": [],
            "token": []
        },
        "1111": {
            "info": {
                "id": 1111,
                "name": "Administrator",
                "icon": null,
                "color": "#ff0000",
                "deletable": 0,
                "sortId": 3,
                "displaySeperate": 1,
                "hasRole": 1
            },
            "permissions": {
                "readMessages": 1,
                "administrator": 1,
                "manageChannels": 0
            },
            "members": [],
            "token": [
            ]
        }
    });
    checkObjectKeys(serverconfig, "groups", {
        "0": {
            "info": {
                "id": 0,
                "name": "Home",
                "icon": "img/default_icon.png",
                "banner": "/img/default_banner.png",
                "isDeletable": 1,
                "sortId": 2,
                "access": []
            },
            "channels": {
                "categories": {
                    "0": {
                        "info": {
                            "id": 0,
                            "name": "General",
                            "sortId": 2
                        },
                        "channel": {
                            "0": {
                                "id": 0,
                                "name": "chat",
                                "type": "text",
                                "description": "",
                                "sortId": 0,
                                "permissions": {
                                    "0": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "viewChannelHistory": 1
                                    }
                                },
                                "msgCount": 0
                            }
                        }
                    }
                }
            },
            "permissions": {
                "0": {
                    "viewGroup": 1,
                    "sendMessages": 1,
                    "readMessages": 1
                }
            }
        }
    })


    // new cool ip block shit
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.urlWhitelist",
        [
            "/^\/discover(\/.*)?$/",
            "/^\/uploads(\/.*)?$/",
            "/^\/emojis(\/.*)?$/"
        ]
    )

    checkObjectKeys(serverconfig, "serverinfo.moderation.ratelimit.actions.user_slowmode", 0)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ratelimit.actions.user_slowmode_duration", "2 minutes")
    checkObjectKeys(serverconfig, "serverinfo.moderation.ratelimit.actions.ratelimit", 0)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ratelimit.record_history", "14 days")

    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.companyDomainWhitelist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blacklist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.whitelist", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockedCountryCodes", [])
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockDataCenter", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockSatelite", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockCrawler", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockBogon", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockProxy", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockVPN", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockTor", true)
    checkObjectKeys(serverconfig, "serverinfo.moderation.ip.blockAbuser", true)

    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.allowXSSTesting", false)
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.displayName", "Banned")
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.displayMessageNotice", `<span class="content-hidden">[ Content hidden ]</span>`)

    checkObjectKeys(serverconfig, "serverinfo.instance.contact.email", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.website", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.reddit", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.discord", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.github", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.signal", "")
    checkObjectKeys(serverconfig, "serverinfo.instance.contact.owner.name", "")

    checkObjectKeys(serverconfig, "serverinfo.defaultTheme", "default.css")

    // livekit VC
    checkObjectKeys(serverconfig, "serverinfo.livekit.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.livekit.key", "dev")
    checkObjectKeys(serverconfig, "serverinfo.livekit.secret", "testing")
    checkObjectKeys(serverconfig, "serverinfo.livekit.url", "localhost:7880")

    // server list / discovery
    checkObjectKeys(serverconfig, "serverinfo.discovery.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.discovery.networkSyncing", true)
    checkObjectKeys(serverconfig, "serverinfo.discovery.defaultStatus", "verified")

    // cool ass system messaging thx to dms
    checkObjectKeys(serverconfig, "serverinfo.system.members.allowCountryCode", true)
    checkObjectKeys(serverconfig, "serverinfo.system.members.ignoreTimeout", "30 days")
    checkObjectKeys(serverconfig, "serverinfo.system.welcome.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.system.welcome.message",
        `<h3>Welcome to the server!</h3>
        <p>
            We hope you'll like it here!
            If you ever need help press the <b>Support</b> button on the top!
        </p>

        <p>
            <a style="font-size: 10px;color: gray;" href="https://ko-fi.com/shydevil/tip" target="_blank">Donate <3</a>
        </p>
    `)

    // home settings
    checkObjectKeys(serverconfig, "serverinfo.home.banner_url", "")
    checkObjectKeys(serverconfig, "serverinfo.home.title", "Default Server Title")
    checkObjectKeys(serverconfig, "serverinfo.home.subtitle", "Default Server Sub-Title")
    checkObjectKeys(serverconfig, "serverinfo.home.about", "This is the <i>default server</i> about me")
    checkObjectKeys(serverconfig, "serverinfo.reports.enabled", true)

    // TURN SERVER SETTINGS
    checkObjectKeys(serverconfig, "serverinfo.app.url", "http://your-ip-or-domain:port")    // without slash at end!


    checkObjectKeys(serverconfig, "groups.*.channels.categories.*.channel.*.msgCount", 0)
    checkObjectKeys(serverconfig, "serverinfo.slots.limit", 100)
    checkObjectKeys(serverconfig, "serverinfo.slots.reserved", 4)
    checkObjectKeys(serverconfig, "serverinfo.slots.ipWhitelist", [
        "::1",
        "::ffff:127.0.0.1"
    ])

    /*
        Account Login Update & Security
    */
    checkObjectKeys(serverconfig, "serverinfo.pow.difficulty", 4)

    checkObjectKeys(serverconfig, "serverinfo.registration.enabled", true)
    checkObjectKeys(serverconfig, "serverinfo.registration.accessCodes", {})

    checkObjectKeys(serverconfig, "serverinfo.login.maxLoginAttempts", 5)

    // Rate Spam & Failed Logins as example
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.ipBanDuration", "10 minutes")
    checkObjectKeys(serverconfig, "serverinfo.moderation.bans.memberListHideBanned", true)

    /*
        Config changes from some update
    */

    // Added MySQL
    checkObjectKeys(serverconfig, "serverinfo.sql.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.sql.host", "localhost")
    checkObjectKeys(serverconfig, "serverinfo.sql.port", 3306)
    checkObjectKeys(serverconfig, "serverinfo.sql.username", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.password", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.database", "dcts")
    checkObjectKeys(serverconfig, "serverinfo.sql.connectionLimit", 10) // Depending on Server Size

    // ssl vars
    checkObjectKeys(serverconfig, "serverinfo.ssl.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.ssl.key", "")
    checkObjectKeys(serverconfig, "serverinfo.ssl.cert", "")
    checkObjectKeys(serverconfig, "serverinfo.ssl.chain", "")

    // If the channel doesnt exist it will not display "member joined" messages etc
    checkObjectKeys(serverconfig, "serverinfo.defaultChannel", "0")
    checkObjectKeys(serverconfig, "serverinfo.countryCode", "")
    // check for message load limit
    checkObjectKeys(serverconfig, "serverinfo.messageLoadLimit", 50)

    // Additional File Types
    // Delete entire uploadFileTypes section from config file to recreate it
    // with the extended list or add manually. will not update if already exists
    checkObjectKeys(serverconfig, "serverinfo.uploadFileTypes",
        {
            allowed: [
                "image/png",
                "image/jpeg",
                "application/pdf",
                "application/json",
                "text/plain",
                "text/markdown",
                "image/png",
                "image/jpeg",
                "image/gif",
                "image/webp",
                "audio/mpeg",
                "video/mp4",
                "audio/vnd.wave"
            ],

            fallback: {
                ".json": "application/json",
                ".md": "text/markdown",
                ".txt": "text/plain",
            }
        }
    );
}