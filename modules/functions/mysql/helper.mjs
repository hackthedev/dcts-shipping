import { queryDatabase } from "./mysql.mjs"
import { XMLHttpRequest, fetch } from "../../../index.mjs";

export async function cacheMediaUrl(url, mediaType){
  return await queryDatabase(`INSERT INTO url_cache (url, media_type) VALUES ('${url}', '${mediaType}')`);
}

export async function getMediaUrlFromCache(url){
  return await queryDatabase(`SELECT media_type FROM url_cache WHERE url='${url}'`);
}

export async function saveChatMessageInDb(message){
  return await queryDatabase(`
    INSERT INTO messages (messageId, message, room) 
    VALUES ('${message.messageId}', '${encodeToBase64((JSON.stringify(message)))}', '${message.room}')
    ON DUPLICATE KEY UPDATE 
        message = VALUES(message), 
        room = VALUES(room)
`);
}

export function encodeToBase64(jsonString) {
  return btoa(encodeURIComponent(jsonString));
}

export function decodeFromBase64(base64String) {
  return decodeURIComponent(atob(base64String));
}

export function escapeJSONString(str) {
  return str.replace(/\\/g, '\\\\')  // Escape backslashes
            .replace(/"/g, '\\"')    // Escape double quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t');  // Escape tabs
}

export async function getChatMessagesFromDb(roomId, index, msgId = null){

  if(msgId != null)
    return await queryDatabase(`SELECT * FROM messages WHERE messageId='${msgId}'`);

  if(index == -1)
    return await queryDatabase(`SELECT * FROM messages WHERE room='${roomId}'`);

  return await queryDatabase(`SELECT top(${index}) * FROM messages WHERE room='${roomId}'`);
}

export async function deleteChatMessagesFromDb(messageId){
  return await queryDatabase(`DELETE FROM messages WHERE messageId='${messageId}'`);
}

export async function getStringSizeInBytes(str) {
  const encoder = new TextEncoder();
  const encodedStr = encoder.encode(str);
  return encodedStr.length;
}

export async function getStringSizeInMegabytes(str) {
  const bytes = await getStringSizeInBytes(str);
  const megabytes = bytes / (1024 * 1024); // Convert bytes to MB
  return megabytes;
}

// same as in chat.js
export async function checkMediaTypeAsync(url) {
  try {
    let response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let contentType = response.headers.get('Content-Type');

    if (!contentType) {
      throw new Error('Content-Type header is missing');
    }

    if (contentType.startsWith('audio/')) {
      return 'audio';
    } else if (contentType.startsWith('video/')) {
      return 'video';
    } else if (contentType.startsWith('image/')) {
      return 'image';
    } else {
      return 'unknown';
    }
  } catch (error) {

    if(error.message.includes("404"))
      return;

    
    //console.error('Error checking media type:', error);
    return 'error';
  }
}

export function isURL(text){
  try {

      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol == "data:";


  } catch (err) {
      return false;
  }
}