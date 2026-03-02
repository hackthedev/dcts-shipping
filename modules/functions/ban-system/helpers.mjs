import {checkRateLimit, isLocalhostIp} from "../main.mjs";
import Logger from "@hackthedev/terminal-logger";
import {saveConfig, serverconfig} from "../../../index.mjs";
import {getJson, getNewDate, getSocketIp} from "../chat/main.mjs";
import {queryDatabase} from "../mysql/mysql.mjs";
import DateTools from "@hackthedev/datetools";

export async function banIp(socket, durationTimestamp = -1) {
    let ip = getSocketIp(socket);
    if(isLocalhostIp(ip)) return;

    if(ip){
        await addBan({
            identifier: ip,
            until: durationTimestamp,
        })

        Logger.info(`IP ${ip} banned until ${new Date(durationTimestamp).toLocaleString()}`);
    }
}

export async function isIpBanned(ip){
    let ban = await getBan(ip);
    return !!ban;
}


export async function unbanIp(socket) {
    let ip = getSocketIp(socket)

    if(ip){
        await removeBan(ip)
    }
}

export async function addBan({
                           identifier,
                           bannedBy = "system",
                           reason = "",
                           until = -1,
                           ip = null,
                       } = {}){
    if(!identifier) throw new Error("Identifier was undefined!")

    let result = await queryDatabase(
        `INSERT INTO bans (memberId, issuerId, ip, reason, until)
               VALUES (?,?,?,?,?) 
                ON DUPLICATE KEY UPDATE issuerId=VALUES(issuerId), ip=VALUES(ip), reason=VALUES(reason), until=VALUES(until)
    `, [identifier, bannedBy, ip, (reason).length === 0 ? null : reason, until])

    return result?.affectedRows >= 0;
}

export async function getBan(identifier){
    let row = await queryDatabase(
        `SELECT * FROM bans WHERE memberId = ? OR ip = ?`,
        [identifier, identifier]
    )

    if(row?.length === 0) return null;
    return row[0]
}

export async function isIdentifierBanned(identifier){
    return !!await getBan(identifier);
}

export async function getBans(timestamp = null){
    let query = `SELECT * FROM bans ORDER BY created DESC LIMIT 50`
    let params = []

    if(timestamp){
        query = `SELECT * FROM bans WHERE created <= ? ORDER BY created DESC LIMIT 50`
        params.push(timestamp)
    }

    let row = await queryDatabase(
        query,
        params
    )

    if(row?.length === 0) return null;
    return row
}

export async function removeBan(identifier){
    if(!identifier) throw new Error("Identifier was undefined!")

    let ban = await getBan(identifier);
    console.log(ban, identifier)

    if(ban){
        let result = await queryDatabase(
            `DELETE FROM bans WHERE memberId = ? OR ip = ?`,
            [identifier, identifier]
        )

        if(result?.affectedRows >= 0){
            Logger.warn(`User/IP ${identifier} has been unbanned`);
        }
    }
}

export async function banUser(socket, member) {
    let ip = getSocketIp(socket);
    if(isLocalhostIp(ip)) ip = null;

    // get member ban date
    let bannedUntil = DateTools.getDateFromOffset(member.duration).getTime();

    // Add member to banlist
    await addBan({
        identifier: member?.target,
        bannedBy: member?.id,
        reason: member?.reason,
        until: bannedUntil,
        ip: ip
    });

    Logger.warn(` User ${serverconfig.servermembers[member.target].name} (IP ${ip}) was added to the banlist because he was banned`.yellow);
    return banIp(socket, bannedUntil);
}

export async function checkMemberBan(socket, member) {
    let ip = getSocketIp(socket);
    checkRateLimit(socket);

    let userBan = await getBan(member?.id);
    let ipBan = ip ? await getBan(ip) : null;

    // check banlist for member
    if (userBan) {
        var durationStamp = userBan?.until;
        var banReason = userBan?.reason;

        if (Date.now() >= durationStamp) {
            // unban user
            removeBan(member?.id);
            return checkAndUnbanIp(ip);
        } else {
            return {result: true, timestamp: durationStamp, reason: banReason};
        }
    }

    return checkAndUnbanIp(ip);

    function checkAndUnbanIp(ip){
        // check ip blacklist
        if (ipBan) {
            if (Date.now() >= ipBan?.until) {
                removeBan(ip);
                return {result: false, timestamp: null}
            } else {
                return {result: true, timestamp: ipBan?.until}
            }
        }

        return {result: false, timestamp: null}
    }
}
