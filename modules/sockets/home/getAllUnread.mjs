import { serverconfig } from "../../../index.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import { queryDatabase } from "../../functions/mysql/mysql.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getAllUnread', async function (member, response) {
        try {
            if (validateMemberId(member.id, socket) !== true && serverconfig.servermembers[member.id].token == member.token) {
                return response?.({ type: 'error', msg: 'unauthorized' });
            }
            const cfgMember = serverconfig?.servermembers?.[String(member.id)];
            if (!cfgMember || cfgMember.token !== member.token) {
                return response?.({ type: 'error', msg: 'forbidden' });
            }

            let unreadDms = 0;
            let unreadContent = 0;
            let isAdmin = await hasPermission(member.id, "manageTickets");

            setTimeout(async () => {
                if (isAdmin) {
                    const [dmsRow] = await queryDatabase(
                        `SELECT COUNT(*) AS unread
                        FROM dms_messages d
                        LEFT JOIN dms_threads t ON t.threadId = d.threadId
                        LEFT JOIN dms_participants p ON p.threadId = d.threadId AND p.memberId = ?
                        LEFT JOIN dms_reads r ON r.threadId = d.threadId AND r.memberId = ?
                        WHERE (p.memberId IS NOT NULL OR t.type = 'ticket')
                        AND (r.last_read_at IS NULL OR d.createdAt > r.last_read_at)
                        AND d.authorId != ?`,
                        [String(member.id), String(member.id), String(member.id)]
                    );
                    unreadDms = Number(dmsRow?.unread || 0);
                } else {
                    const [dmsRow] = await queryDatabase(
                        `SELECT COUNT(*) AS unread
                        FROM dms_messages d
                        JOIN dms_participants p ON p.threadId = d.threadId AND p.memberId = ?
                        LEFT JOIN dms_reads r ON r.threadId = d.threadId AND r.memberId = ?
                        WHERE (r.last_read_at IS NULL OR d.createdAt > r.last_read_at)
                        AND d.authorId != ?`,
                        [String(member.id), String(member.id), String(member.id)]
                    );
                    unreadDms = Number(dmsRow?.unread || 0);
                }

                // content-unread
                const [contentRow] = await queryDatabase(
                    `SELECT COUNT(*) AS unread
                        FROM content_reads cr
                        WHERE cr.userId = ? AND cr.readAt IS NULL`,
                    [String(member.id)]
                );
                unreadContent = Number(contentRow?.unread || 0);

                const totalUnread = unreadDms + unreadContent;

                const row = {
                    unread_dms: unreadDms,
                    unread_content: unreadContent,
                    unread_total: totalUnread
                };

                return response?.({ type: 'success', unread: totalUnread });
            }, 200);
            // i added this delay so if a message is sent, 
            // it would instantly fetch unread messages, 
            // while at the same time mark it as unread,
            // making the message indicator flash briefly.
            //
            // i thought it would be better to add a small delay
            // server side instead of having to deal with it in the 
            // client. if someone ever makes a custom client, it would
            // be nice to have things work out of the box if possible
        } catch (err) {
            Logger.error(err);
            return response?.({ type: 'error', msg: 'getAllUnread failed' });
        }
    });
}
