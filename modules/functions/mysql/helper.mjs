import { queryDatabase } from "./mysql.mjs";
import { XMLHttpRequest, fetch } from "../../../index.mjs";
import { report } from "process";
import Logger from "../logger.mjs";

export async function cacheMediaUrl(url, mediaType) {
  const query = `INSERT IGNORE INTO url_cache (url, media_type) VALUES (?, ?)`;
  return await queryDatabase(query, [url, mediaType]);
}

export async function getMediaUrlFromCache(url) {
  const query = `SELECT media_type FROM url_cache WHERE url = ?`;
  return await queryDatabase(query, [url]);
}

export async function saveReport(reportCreator, reportedUser, reportType, reportData = nul, reportNotes = null) {
  const query = `INSERT INTO reports (reportCreator, reportedUser, reportType, reportData, reportNotes) VALUES (?, ?, ?, ?, ?)`;
  return await queryDatabase(query, [reportCreator, reportedUser, reportType, reportData, reportNotes]);
}

export async function getReports(filter = "") {
  const query = `SELECT * FROM reports ${filter}`;
  return await queryDatabase(query, []);
}

export async function deleteReport(reportId) {
  const query = `DELETE FROM reports WHERE id = ?`;
  return await queryDatabase(query, [reportId]);
}

export async function saveChatMessageInDb(message) {
  const query = `
    INSERT INTO messages (authorId, messageId, message, room) 
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      message = VALUES(message), 
      room = VALUES(room)
  `;

  const encodedMessage = encodeToBase64(JSON.stringify(message));
  return await queryDatabase(query, [message.id, message.messageId, encodedMessage, message.room]);
}

export async function logEditedChatMessageInDb(message) {
  const query = `
    INSERT INTO message_logs (authorId, messageId, message, room) 
    VALUES (?, ?, ?, ?)
  `;

  message.editedTimestamp = new Date().getTime();
  const encodedMessage = encodeToBase64(JSON.stringify(message));
  return await queryDatabase(query, [message.id, message.messageId, encodedMessage, message.room]);
}

export function leaveAllRooms(socket, memberId = null) {
  const rooms = socket.rooms;
  rooms.forEach((room) => {
    if (room !== socket.id && room != memberId) { // Exclude the socket's own room
      socket.leave(room);
    }
  });
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

export async function getChatMessagesFromDb(roomId, index, msgId = null) {
  if (msgId != null) {
    const query = `SELECT * FROM messages WHERE messageId = ?`;
    return await queryDatabase(query, [msgId]);
  }

  if (index === -1) {
    const query = `SELECT * FROM messages WHERE room = ?`;
    return await queryDatabase(query, [roomId]);
  }

  const query = `SELECT * FROM messages WHERE room = ? LIMIT ?`;
  return await queryDatabase(query, [roomId, index]);
}

export async function getChatMessageById(msgId) {
  // SQL FEATURE ONLY obvously

  // nothing was supplied
  if (!msgId) {
    Logger.warn("Cannot get message without message id")
    return;
  }

  const query = `SELECT * FROM messages WHERE messageId = ?`;
  return await queryDatabase(query, [msgId]);
}

export async function getMessageLogsFromDb(msgId) {

  // nothing was supplied
  if (!msgId) {
    Logger.warn("Cannot get message logs without message id")
    return;
  }

  const query = `SELECT * FROM message_logs WHERE messageId = ?`;
  return await queryDatabase(query, [msgId]);
}

export async function deleteChatMessagesFromDb(messageId) {
    if(!messageId){
        Logger.warn("Tried to delete a message from the db but the message id was null");
        Logger.warn(messageId)
        return;
    }

  // dm message
  if (messageId?.startsWith("m_")) {
    const query = `DELETE FROM dms_messages WHERE messageId = ?`;
    return await queryDatabase(query, [messageId]);
  }

  const query = `DELETE FROM messages WHERE messageId = ?`;
  return await queryDatabase(query, [messageId]);
}

export async function getStringSizeInBytes(str) {
  const encoder = new TextEncoder();
  const encodedStr = encoder.encode(str);
  return encodedStr.length;
}

export async function getStringSizeInMegabytes(str) {
  const bytes = await getStringSizeInBytes(str);
  return bytes / (1024 * 1024); // Convert bytes to MB
}

// Same as in chat.js
export async function checkMediaTypeAsync(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type');

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
    if (error.message.includes("404")) return;
    return 'error';
  }
}

export function isURL(text) {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:';
  } catch (err) {
    return false;
  }
}
