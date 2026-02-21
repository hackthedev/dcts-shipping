import { serverconfig, xssFilters, checkedMediaCacheUrls } from "../../index.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";

import {
    getMediaUrlFromCache,
    cacheMediaUrl,
    checkMediaTypeAsync,
    isURL,
} from "../functions/mysql/helper.mjs"

export function compareTimestamps(stamp1, stamp2) {
    var diff = stamp2 - stamp1;
    var minutesPassed = Math.round(diff / 60000);
    return minutesPassed;
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on('checkMediaUrlCache', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (serverconfig.serverinfo.sql.enabled == false) {
                Logger.warn("Media Cache cannot be used when SQL is disabled!");
                Logger.warn("Consider setting up a mysql server to reduce server load and load time");
                response({ type: "success", isCached: false, mediaType: await checkMediaTypeAsync(member.url) });
                return;
            }

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            // Initialize the object
            if (!checkedMediaCacheUrls[member.url]) {
                checkedMediaCacheUrls[member.url] = {};
            }

            // if its not a url we dont want to process it
            if (!isURL(member.url)) {
                response({ type: "error", isCached: false });
                return;
            }

            // remove item from ram if its in there for over x minutes
            if(checkedMediaCacheUrls[member.url]?.timestamp){
                if(compareTimestamps(checkedMediaCacheUrls[member.url]?.timestamp, new Date().getTime()) >= 10){
                    delete checkedMediaCacheUrls[member.url];
                }
            }

            if (checkedMediaCacheUrls[member.url].mediaType != null) {
                // Link was already sent in for check
                response({ type: "success", isCached: true, mediaType: checkedMediaCacheUrls[member.url].mediaType });
                return;
            }
            let result = await getMediaUrlFromCache(member.url);

            if (result.length > 0) {
                checkedMediaCacheUrls[member.url].mediaType = result[0].media_type;
                checkedMediaCacheUrls[member.url].timestamp = new Date().getTime();
                response({ type: "success", isCached: true, mediaType: result[0].media_type });
                return;
            }

            let urlMediaType = await checkMediaTypeAsync(member.url);

            if (urlMediaType != "unknown" && urlMediaType != "error" && urlMediaType != null) {
                await cacheMediaUrl(member.url, urlMediaType);
                checkedMediaCacheUrls[member.url].mediaType = urlMediaType;
                checkedMediaCacheUrls[member.url].timestamp = new Date().getTime();
            }

            response({ type: "success", isCached: false, mediaType: urlMediaType });
        }
    });
}
