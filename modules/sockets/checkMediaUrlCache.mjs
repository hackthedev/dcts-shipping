import { serverconfig, xssFilters, checkedMediaCacheUrls } from "../../index.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";

import {
    getMediaUrlFromCache,
    cacheMediaUrl,
    checkMediaTypeAsync,
    isURL,
} from "../functions/mysql/helper.mjs"

export default (socket) => {
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
                return;
            }


            if (checkedMediaCacheUrls[member.url].mediaType != null) {
                // Link was already sent in for check
                response({ type: "success", isCached: true, mediaType: checkedMediaCacheUrls[member.url].mediaType });
            }
            else {
                // check if link is cached
                let result = await getMediaUrlFromCache(member.url);

                if (result.length <= 0) {

                    // if its not cached, get media type by using a request
                    let urlMediaType = await checkMediaTypeAsync(member.url);

                    // if the media type isnt unknown
                    if (urlMediaType != "unkown" && urlMediaType != "error" && urlMediaType != null) {

                        // try to save the url in cache
                        let cacheResult = await cacheMediaUrl(member.url, urlMediaType);
                    }
                }
                else {
                    // Save in "internal" cache until program is restarted. 
                    // supposed to avoid multiple requests
                    checkedMediaCacheUrls[member.url].mediaType = result[0].media_type;
                    response({ type: "success", isCached: true, mediaType: result[0].media_type });
                }
            }



            response({ type: "error", isCached: false });
        }
    });
}
