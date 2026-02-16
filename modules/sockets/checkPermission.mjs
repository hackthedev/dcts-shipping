import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

let permList = {
    "readMessages": {
        name: "Read Messages",
        type: "checkbox",
        category: ["channelPerms", "serverRoles"],
        description: ""
    },
    "sendMessages": {
        name: "Send Messages",
        type: "checkbox",
        category: ["channelPerms", "serverRoles"],
        description: ""
    },
    "viewAnonymousMessages": {
        name: "View anonymous messages",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows viewing anonymous messages and messages by banned accounts"
    },
    "sendAnonymousMessages": {
        name: "Send anonymous messages",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows sending anonymous messages"
    },
    "kickUsers": {
        name: "Kick Members",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Accounts of kicked members will be deleted"
    },
    "disconnectUsers": {
        name: "Disconnect Members",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Will close the connection to a user"
    },
    "muteUsers": {
        name: "Mute Members",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: ""
    },
    "administrator": {
        name: "Administrator",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Will grand all permissions"
    },
    "manageServerInfo": {
        name: "Manage Server Info",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows changing server name and description"
    },
    "manageNetworkServers": {
        name: "Manage Network Servers",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows managing servers discovered from the network that are displayed on the discovery page"
    },
    "viewAuditLog": {
        name: "View Audit Log",
        type: "checkbox",
        category: ["serverRoles"],
        description: ""
    },
    "manageIpSettings": {
        name: "Edit IP Security Settings",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Edit settings like IP based abuse, spam, VPN detection and more"
    },
    "manageInvites": {
        name: "Manage Invites",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Manage invite codes"
    },
    "manageServer": {
        name: "Manage Server",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can view the server settings page"
    },
    "createCategory": {
        name: "Create Categories",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: ""
    },
    "updateGroupBanner": {
        name: "Update Group Banner",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Lets a member change the group banner image"
    },
    "updateGroupIcon": {
        name: "Update Group Icon",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Lets a member change the group icon image"
    },
    "manageChannels": {
        name: "Manage Channels",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Allows editing of channels"
    },
    "manageEmojis": {
        name: "Manage Emojis",
        type: "checkbox",
        category: ["serverRoles"],
        description: ""
    },
    "manageBans": {
        name: "Manage Bans",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Manage existing bans"
    },
    "banMember": {
        name: "Ban Member",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Allows banning other members"
    },
    "manageGroups": {
        name: "Manage Groups",
        type: "checkbox",
        category: ["serverRoles"],
        description: ""
    },
    "manageMessages": {
        name: "Manage Messages",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Lets a member delete messages of others"
    },
    "uploadFiles": {
        name: "Upload Files",
        type: "checkbox",
        category: ["channelPerms", "serverRoles", "groupPerms"],
        description: "Without this permission nobody can change their profile picture and banner or upload files. Exception: Pre-Uploaded files like image urls"
    },
    "maxUpload": {
        name: "max Upload size",
        type: "int",
        category: ["channelPerms", "serverRoles", "groupPerms"],
        description: "max. allowed file size members can upload in this role"
    },
    "manageRoles": {
        name: "Manage Roles",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Members with this permission can edit roles that are lower than their own role"
    },
    "manageMembers": {
        name: "Manage Member Roles",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: "Allows members to assign roles to other members that are lower than their own highest role"
    },
    "pingEveryone": {
        name: "Ping everyone",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows members to mention everyone with @Member"
    },
    "manageUploads": {
        name: "Manage Uploads",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can edit upload settings"
    },
    "manageRateSettings": {
        name: "Manage Rate Limits",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can edit rate limit settings"
    },
    "bypassRateSettings": {
        name: "Bypass Rate Limits",
        type: "checkbox",
        category: ["serverRoles", "groupPerms"],
        description: ""
    },
    "redeemKey": {
        name: "Redeem Keys",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows a user to redeem a key in order to gain a role."
    },
    "manageReports": {
        name: "Manage Reports",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can edit and delete reported messages"
    },
    "manageTickets": {
        name: "Manage Tickets",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can manage support tickets. Tickets are more general."
    },
    "managePosts": {
        name: "Manage Posts",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Can manage server home posts."
    },
    "viewChannelHistory": {
        name: "View Channel History",
        type: "checkbox",
        category: ["channelPerms", "serverRoles"],
        description: "View messages that were already sent"
    },
    "viewChannel": {
        name: "View Channel",
        type: "checkbox",
        category: ["channelPerms"],
        description: ""
    },
    "bypassSlowmode": {
        name: "Bypass Slowmode",
        type: "checkbox",
        category: ["channelPerms", "serverRoles"],
        description: "Ignores chat slow done. *to be implemented*"
    },
    "useVOIP": {
        name: "Use Voice Chat",
        type: "checkbox",
        category: ["channelPerms", "serverRoles"],
        description: ""
    },
    "sendURL": {
        name: "Send URLs",
        type: "checkbox",
        category: ["channelPerms", "serverRoles", "groupPerms"],
        description: "If a member is can send URLs like http://, domain.com. etc"
    },
    "sendFiles": {
        name: "Send Files",
        type: "checkbox",
        category: ["channelPerms", "serverRoles", "groupPerms"],
        description: "Will block messages containing files like images"
    },
    "viewGroup": {
        name: "View Group",
        type: "checkbox",
        category: ["groupPerms"],
        description: ""
    },
    "createGroup": {
        name: "Create Groups",
        type: "checkbox",
        category: ["serverRoles"],
        description: ""
    },
    "viewLogs": {
        name: "View Logs",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows viewing server logs"
    },
    "resolveMembers": {
        name: "Resolve Members",
        type: "checkbox",
        category: ["serverRoles"],
        description: "Allows resolving members. Used internally"
    }

}

export default (io) => (socket) => {

    socket.on('getPermissions', function (member, response) {
        if (validateMemberId(member?.id, socket) === true && serverconfig.servermembers[member?.id].token === member?.token) {
            const categories = member.categories || []; // optional filter

            let filteredPerms = {};

            for (const [permKey, permValue] of Object.entries(permList)) {
                // Include if no filter or if category array includes any filter category
                if (
                    categories.length === 0 ||
                    permValue.category.some(cat => categories.includes(cat))
                ) {
                    filteredPerms[permKey] = permValue;
                }
            }

            response({ error: null, permissions: filteredPerms });
        }
    });


    // socket.on code here
    socket.on('checkPermission', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true) {

            var userObj = getCastingMemberObject(serverconfig.servermembers[member.id]);

            if (Array.isArray(member.permission)) {

                for (let i = 0; i < member.permission.length; i++) {
                    let permCheck = validatePermission(member.permission[i]);
                    if (permCheck?.error) {
                        if (!member.any) {
                            response({ permission: "denied", user: userObj, error: permCheck.error });
                            return;
                        }
                        
                        continue;
                    }

                    if (hasPermission(member.id, member.permission[i])) {
                        if (member.any) {
                            response({ permission: "granted", user: userObj });
                            return;
                        }
                        
                    } else if (!member.any) {
                        response({ permission: "denied", user: userObj });
                        return;
                    }
                }
                
                response({ permission: member.any ? "denied" : "granted", user: userObj });
            }

            else { // Single permission check

                let permCheck = validatePermission(member.permission);
                if (permCheck?.error !== null) {
                    response({ permission: "denied", user: userObj, error: permCheck.error })
                    return;
                }

                if (hasPermission(member.id, member.permission)) {
                    response({ permission: "granted", user: userObj });
                } else {
                    response({ permission: "denied", user: userObj });
                }
            }
        }
    });
}

function validatePermission(permission, value = null) {
    if (!permList.hasOwnProperty(permission)) {
        Logger.warn(`Permission ${permission} not found!`)
        return { error: "Permission not found" };
    }

    // skip value check types
    if (!value) return { error: null };

    if (permList[permission].type == "checkbox" && (value !== 1 && value !== 0)) return { error: `${permission} value requires 1 or 2, but is ${value}` }
    if (permList[permission].type == "int" && !Number.isInteger(value)) return { error: `${permission} value integer, but is ${value}` }
}