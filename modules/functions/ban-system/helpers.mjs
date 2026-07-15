import {checkRateLimit, isLocalhostIp} from "../main.mjs";
import Logger from "@hackthedev/terminal-logger";
import {saveConfig, serverconfig, signer} from "../../../index.mjs";
import {formatDateTime, getJson, getNewDate, getSocketIp} from "../chat/main.mjs";
import {queryDatabase} from "../mysql/mysql.mjs";
import DateTools from "@hackthedev/datetools";
import {dSyncSign} from "@hackthedev/dsync-sign";

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
                           publicKey = null,
                       } = {}){
    if(!identifier) throw new Error("Identifier was undefined!")

    if(publicKey) publicKey = signer.normalizePublicKey(publicKey)

    let result = await queryDatabase(
        `INSERT INTO bans (memberId, issuerId, ip, publicKey, reason, until)
               VALUES (?,?,?,?,?,?) 
                ON DUPLICATE KEY UPDATE issuerId=VALUES(issuerId), ip=VALUES(ip),publicKey=VALUES(publicKey), reason=VALUES(reason), until=VALUES(until)
    `, [identifier, bannedBy, ip, publicKey, (reason).length === 0 ? null : reason, until])

    return result?.affectedRows >= 0;
}

export async function getBan(identifier){
    if(!identifier) throw new Error("Identifier not set")

    let normalized = signer.normalizePublicKey(identifier);
    let row = await queryDatabase(
        `SELECT * FROM bans WHERE memberId = ? OR ip = ? OR publicKey = ?`,
        [identifier, identifier, normalized]
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

    if(ban){
        let result = await queryDatabase(
            `DELETE FROM bans WHERE memberId = ? OR ip = ? OR publicKey = ?`,
            [identifier, identifier, identifier]
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
        ip: ip,
        publicKey: signer.normalizePublicKey(member?.publicKey)
    });

    Logger.warn(` User ${serverconfig.servermembers[member.target].name} (IP ${ip}) was added to the banlist because he was banned`.yellow);
    return banIp(socket, bannedUntil);
}

export async function checkMemberBan(socket, member) {
    if(socket){
        let ip = getSocketIp(socket);
        checkRateLimit(socket);

        let ipCheckResult = checkAndUnbanIp(ip);
        if(ipCheckResult?.result === true) return ipCheckResult
    }
    else{
        Logger.warn("Skipped IP Check and Rate limit as socket wasnt provided!")
    }

    let userBan = await getBan(member?.id);

    // check banlist for member
    if (userBan) {
        var durationStamp = userBan?.until;
        var banReason = userBan?.reason;

        if (Date.now() >= durationStamp) {
            // unban user
            removeBan(member?.id);
            return checkAndUnbanIp(ip);
        } else {
            return {result: true, timestamp: durationStamp, reason: banReason, text: getBannedText(userBan)};
        }
    }

    let publicKeyCheckResult = checkAndUnbanPublicKey(member?.publicKey);
    return publicKeyCheckResult;
}

async function checkAndUnbanIp(ip){

    let ipBan = ip ? await getBan(ip) : null;

    // check ip blacklist
    if (ipBan) {
        if (Date.now() >= ipBan?.until) {
            removeBan(ip);
            return {result: false, timestamp: null, text: null}
        } else {
            return {result: true, timestamp: ipBan?.until, text: getBannedText(userBan)}
        }
    }

    return {result: false, timestamp: null, text: null}
}

export async function checkAndUnbanPublicKey(publicKey){
    let normalized = signer.normalizePublicKey(publicKey) ?? null
    let publicKeyBan = normalized ? await getBan(normalized) : null;

    // check publicKey blacklist
    if (publicKeyBan) {
        if (Date.now() >= publicKeyBan?.until) {
            removeBan(publicKey);
            return {result: false, timestamp: null, text: null}
        } else {
            return {result: true, timestamp: publicKeyBan?.until, text: getBannedText(publicKeyBan)}
        }
    }

    return {result: false, timestamp: null, text: null}
}

function getBannedText(banInfo){
    let banText = "You've been ";
    if (banInfo?.until) {
        if (new Date(banInfo.until).getFullYear() === 9999) {
            banText += "permanently banned";
        } else {
            banText += `banned until <br>${formatDateTime(new Date(banInfo.until))}`;
        }
    }

    if (banInfo?.reason) {
        banText += `<br><br>Reason:<br>${banInfo.reason}`;
    }

    return banText;
}