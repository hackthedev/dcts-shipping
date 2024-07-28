/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {io, request} from "../../../index.mjs";
import {consolas} from "../io.mjs";

export function isVideo(url) {
    // Should try to load a video and see if the video length changes
    return /\.(mp4|webp)$/.test(url);
}

export function isImgUrl(url) {
    return new Promise((resolve, reject) => {
        return request( url, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                if(((response.headers['content-type']).match(/(image)+\//g)).length != 0){
                    resolve(true);
                    //return true;
                }else{
                    resolve(false);
                    //return false;
                }

                resolve(true);
                //return true;

            } else {
                resolve(false);
                //return false;
            }
        });
    });
    //return /\.(jpg|jpeg|png|webp|avif|gif)$/.test(url)
}

export function linkify(text, messageid, roomid) {
    // Function might be unused??

    return new Promise((resolve, reject) => {

        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

        return text.replace(urlRegex, function (url) {

            if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {


                resolve(createYouTubeEmbed(url));
                return createYouTubeEmbed(url);

            } else {

                isImgUrl(url).then((result) => {

                    if (result == true) {
                        console.log("Returning img embed")

                        var code = `<a href="${url}" target="_blank">${url}</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`
                        io.in(roomid).emit("createMessageEmbed", {messageId: messageid, code: code});

                        resolve(`<a href="${url}" target="_blank">${url}</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`);
                        //return `<a href="' + url + '" target="_blank">' + url + '</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`;




                    } else if (isVideo(url)) {
                        console.log("Returning vid embed")

                        var code = `<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                            <source src="${url}">
                            </video></div>`;

                        io.in(roomid).emit("createMessageEmbed", {messageId: messageid, code: code});

                        resolve(`<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                            <source src="${url}">
                            </video></div>`);

                        //return `<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                        //<source src="${url}">
                        //</video></div>`;

                    } else {
                        console.log("Returning url")

                        var code = `<a href="${url}" target="_blank">${url}</a>`;
                        io.in(roomid).emit("createMessageLink", {messageId: messageid, code: code});
                        resolve('<a href="' + url + '" target="_blank">' + url + '</a>');
                        return '<a href="' + url + '" target="_blank">' + url + '</a>';
                    }
                })
            }
        });
    });
}

export function createYouTubeEmbed(url, messageid){

    var videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");

    var code = `<div class="iframe-container" id="${messageid}" ><iframe width="560" height="315" src="https://www.youtube.com/embed/${videocode}" 
                title="YouTube video player" frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;

    consolas("Resolving YouTube URL " + url);
    consolas("Resolved: " + videocode);
    consolas("Resolved URL: " + "https://www.youtube.com/embed/" + videocode);

    return code;

}