import {db, serverconfig} from "../../../index.mjs";
import dSyncRateLimit from "@hackthedev/dsync-ratelimit";
import DateTools from "@hackthedev/datetools";
import {getMemberLatestMessage} from "../chat/helper.mjs";
import {checkMessageObjReactions} from "../../sockets/resolveMessage.mjs";

export async function getChannelRateLimit({
                                              room,
                                              memberId = null,
                                              callback = null
                                          } = {}
) {

    if (!room) throw new Error("Room not supplied");

    const {currentHourlyAverage} = await getChannelMessageFrequency({room, memberId});
    const baseline = currentHourlyAverage;


    let userSlowModeMultiplier = serverconfig.serverinfo.moderation.ratelimit.actions.user_slowmode
    let rateLimitMultiplier = serverconfig.serverinfo.moderation.ratelimit.actions.ratelimit

    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const params = [hourStart.getTime(), dayStart.getTime(), room, dayStart.getTime()];
    let authorFilter = "";

    if (memberId) {
        authorFilter = " AND authorId = ?";
        params.push(memberId);
    }

    const result = await db.queryDatabase(
        `SELECT SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) AS currentHourly,
                SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) AS currentDaily
         FROM messages
         WHERE room = ?
           AND createdAt >= ?${authorFilter} AND message NOT LIKE '%isSystemMsg%'`,
        params
    );

    const row = Array.isArray(result?.[0]) ? result[0][0] : result[0];
    const currentHourly = row?.currentHourly || 0;
    const currentDaily = row?.currentDaily || 0;

    let memberLatestMessage = null;
    if(memberId){
        memberLatestMessage = await getMemberLatestMessage(memberId);
    }

    let returnData = {
        currentHourly: Number(currentHourly),
        currentDaily: Number(currentDaily),
        baseline,
        slowmode: userSlowModeMultiplier === 0 ? false : currentHourly >= baseline * userSlowModeMultiplier,
        rateLimited: rateLimitMultiplier === 0 ? false : currentHourly >= baseline * rateLimitMultiplier
    }

    if (callback && typeof callback === "function") {
        await callback(returnData)
    }

    return returnData;
}

export async function getChannelMessageFrequency({
                                                     room,
                                                     memberId = null,
                                                     since = DateTools.getDateFromOffset(serverconfig.serverinfo.moderation.ratelimit.record_history)
                                                 }) {

    if (!(since instanceof Date) || isNaN(since.getTime())) {
        since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    since.setHours(0, 0, 0, 0);

    const sinceMs = since.getTime();
    const params = [room, sinceMs];
    let authorFilter = "";

    if (memberId) {
        authorFilter = " AND authorId = ?";
        params.push(memberId);
    }

    // grouping by day
    const result = await db.queryDatabase(
        `
            SELECT FROM_UNIXTIME(createdAt / 1000, '%Y-%m-%d') AS day,
             COUNT(*) AS messages
            FROM messages
            WHERE room = ? AND createdAt >= ?${authorFilter} AND message NOT LIKE '%isSystemMsg%'
            GROUP BY day
            ORDER BY day
        `,
        params
    );

    // grouping by hour as its more accurate too if you think about it for a minute
    const hourlyResult = await db.queryDatabase(
        `
            SELECT HOUR (FROM_UNIXTIME(createdAt / 1000)) AS hour, COUNT (*) / COUNT (DISTINCT DATE (FROM_UNIXTIME(createdAt / 1000))) AS avgMessages
            FROM messages
            WHERE room = ? AND createdAt >= ?${authorFilter} AND message NOT LIKE '%isSystemMsg%'
            GROUP BY hour
            ORDER BY hour
        `,
        params
    );

    const rows = Array.isArray(result?.[0]) ? result[0] : result;
    const hourlyRows = Array.isArray(hourlyResult?.[0]) ? hourlyResult[0] : hourlyResult;

    let totalMessageCountInSpan = 0;
    for (let row in rows) {
        totalMessageCountInSpan += rows[row].messages;
    }

    let dailyAverage = Math.round(totalMessageCountInSpan / rows.length);

    // here we map the shit outta the data by getting baselines per hour.
    // when i tried / 24 it may cauz false alarms n shit
    const hourlyBaseline = new Map();
    for (let row of hourlyRows) {
        hourlyBaseline.set(row.hour, Math.round(row.avgMessages));
    }

    // here we just get the baseline now for the current hour.
    // if im not wrong it is based on the hour of the system dcts runs on.
    // shouldnt matter tho?
    const currentHour = new Date().getHours();
    const currentHourlyAverage = hourlyBaseline.get(currentHour) || 0;

    // here we get the hourlyAverage
    const avgValues = [...hourlyBaseline.values()];
    const hourlyAverage = Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length);

    return {
        rows,
        dailyAverage,
        hourlyAverage,
        hourlyBaseline,
        currentHourlyAverage
    };
}