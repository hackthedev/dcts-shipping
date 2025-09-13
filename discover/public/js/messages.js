const MESSAGES_BTN_ID = "messages-button";

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function fetchMessages(unreadOnly = false) {
    const q = unreadOnly ? "?unreadOnly=1" : "";
    const data = await apiRequest(`me/messages${q}`, "GET", null, true);
    return Array.isArray(data?.messages) ? data.messages : (data?.messages || []);
}

async function fetchMessageCount() {
    try {
        const data = await apiRequest("me/messages?unreadOnly=1", "GET", null, true);
        return Array.isArray(data?.messages) ? data.messages.length : 0;
    } catch (e) {
        return 0;
    }
}

function makeMessagesButton(count) {
    const btn = document.createElement("input");
    btn.type = "button";
    btn.id = MESSAGES_BTN_ID;
    btn.value = `Messages (${count})`;
    btn.style.marginLeft = "12px";
    btn.onclick = async () => openMessagesPrompt();
    return btn;
}

function renderMessagesTableHtml(messages) {
    let html = `<div id="messages-container" style="max-width:900px; overflow:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;overflow-y: auto;">
        <thead>
          <tr style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.08);">
            <th style="padding:8px; width:36px"></th>
            <th style="padding:8px">Message</th>
            <th style="padding:8px; width:160px">Created</th>
            <th style="padding:8px; width:160px">Actions</th>
          </tr>
        </thead>
        <tbody>`;

    for (const m of messages) {
        const id = m.id;
        const rawMsg = m.message ?? m.msg ?? m.text ?? "";
        const msgHtml = (typeof sanitizeHtmlForRender === "function")
            ? sanitizeHtmlForRender(rawMsg)
            : escapeHtml(rawMsg).replaceAll("\n", "<br>");
        const created = m.created_at ? new Date(escapeHtml(String(m.created_at))).toLocaleString() : "";
        const isRead = Boolean(m.is_read || m.read || m.marked_read || false);

        /*
        const icon = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isRead ? 'rgba(255,255,255,0.6)' : '#fff'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 8.5v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <polyline points="3 8.5 12 14 21 8.5" />
        </svg>`;*/

        const actionBtnLabel = isRead ? "Mark unread" : "Mark read";
        const actionPayload = isRead ? "mark_unread" : "mark_read";

        html += `<tr data-msg-id="${id}" style="border-bottom:1px solid rgba(255,255,255,0.03);">
        <td style="padding:8px; vertical-align:top;"></td> <!-- icon here -->
        <td style="padding:8px; vertical-align:top;">${msgHtml}</td>
        <td style="padding:8px; vertical-align:top;">${created}</td>
        <td style="padding:8px; vertical-align:top; white-space:nowrap;">
          ${!isRead ?
            `<button class="msg-action-btn" data-id="${id}" data-action="${actionPayload}" style="margin-right:8px;">${actionBtnLabel}</button>` : ""
            }
        </td>
      </tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

async function openMessagesPrompt() {
    try {
        const data = await apiRequest("me/messages", "GET", null, true);
        const messages = data.messages || [];
        const html = renderMessagesTableHtml(messages.reverse());
        customPrompts.showPrompt("Messages", html, null, ["Close", null]);
        const container = document.getElementById("messages-container");
        if (!container) return;
        container.addEventListener("click", onMessagesContainerClick);
    } catch (err) {
        if (err && err.message && (err.message.includes("Unauthorized") || err.message.startsWith("HTTP 401"))) {
            loginAccount();
            return;
        }
        alert(err?.message || "Could not load messages");
    }
}

async function onMessagesContainerClick(e) {
    const btn = e.target.closest(".msg-action-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    try {
        btn.disabled = true;
        if (action === "mark_read") {
            await apiRequest(`me/messages/${id}`, "POST", { read: true }, true);
        } else if (action === "mark_unread") {
            await apiRequest(`me/messages/${id}`, "POST", { read: false }, true);
        } else {
            btn.disabled = false;
            return;
        }
        // refresh prompt contents and button label/count
        customPrompts.close && typeof customPrompts.close === "function" && customPrompts.close();
        await refreshMessagesButton();
        await openMessagesPrompt();
    } catch (err) {
        btn.disabled = false;
        console.error(err);
        alert(err?.message || "Action failed");
    }
}

async function refreshMessagesButton() {
    const count = await fetchMessageCount();
    let btn = document.getElementById(MESSAGES_BTN_ID);
    if (!btn) {
        const container = document.querySelector("#header .right");
        if (!container) return;
        btn = makeMessagesButton(count);
        container.insertAdjacentElement("afterbegin", btn);
    } else {
        btn.value = `Messages(${count})`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const container = document.querySelector("#header .right");
        if (!container) return;
        await refreshMessagesButton();
    } catch (e) {
        // ignore
    }
});