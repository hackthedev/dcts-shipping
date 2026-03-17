import {io, serverconfig, signer, usersocket, xssFilters} from "../../../index.mjs";
import {hasPermission, shouldIgnoreMember} from "../../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger"
import { copyObject, emitBasedOnPermission, getCastingMemberObject, sanitizeInput, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";
import { decodeFromBase64, encodeToBase64 } from "../../functions/mysql/helper.mjs";
import { queryDatabase } from "../../functions/mysql/mysql.mjs";
import {sanitizeHTML} from "../../functions/sanitizing/functions.mjs";
import JSONTools from "@hackthedev/json-tools";


export async function sendSystemMessage(targetUserId, text, opts = {}) {
  return null;
}

async function emitToThread(threadId, event, payload) {
    const rows = await queryDatabase(
        `SELECT memberId FROM dms_participants WHERE threadId = ?`,
        [threadId]
    );
    for (const r of rows) {
        try {
            const memberId = String(r.memberId);
            const sockId = usersocket[memberId];

            io.to(memberId).emit(event, payload);
        } catch (err) {
            Logger.error("emitToThread: emit failed for member", r.memberId, err);
            // continue to next participant
        }
    }
}

export default (io) => (socket) => {

};