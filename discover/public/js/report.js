async function reportServerPrompt(serverId) {
    const html = `
    <div style="display:grid;gap:8px;min-width:320px">
      <label class="prompt-label">Reason<br>
        <select class="prompt-select" id="report-reason" style="width:100%">
          <option value="">-- choose --</option>
          <option value="spam">Spam / Scam</option>
          <option value="abuse">Abuse / Hate</option>
          <option value="illegal">Illegal content</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label class="prompt-label">Details (optional)<br>
        <textarea class="prompt-input" id="report-details" rows="4" style="width:100%"></textarea>
      </label>
    </div>
  `;
    return customPrompts.showPrompt("Report Server", html, async () => {
        const reasonEl = document.getElementById("report-reason");
        const detailsEl = document.getElementById("report-details");
        const reason = reasonEl ? reasonEl.value.trim() : "";
        const details = detailsEl ? detailsEl.value.trim() : "";
        if (!reason) throw new Error("Please choose a reason");
        try {
            await apiRequest(`servers/${serverId}/report`, "POST", {reason, details}, true);
        } catch (err) {
            if (err && err.message && (err.message.includes("Unauthorized") || err.message.startsWith("HTTP 401"))) {
                loginAccount();
                throw err;
            }
            throw err;
        }
        return true;
    }, ["Report", "error"]);
}

function onListClick(e) {
    const reportBtn = e.target.closest('[data-action="report"]');
    if (reportBtn) {
        const id = reportBtn.dataset.id;
        if (!id) return;
        reportServerPrompt(id).catch(() => {
        });

    }
}

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("publicList");
    if (list) list.addEventListener("click", onListClick);
    window.reportServerPrompt = reportServerPrompt;

    setTimeout(() => {
        if (isAdmin()) {
            const reportsBtn = document.createElement("input");
            reportsBtn.type = "button";
            reportsBtn.value = "Reports";
            reportsBtn.style.marginLeft = "12px";
            reportsBtn.onclick = async () => {
                await fetchReports();
            };
            document.querySelector("#header .right").insertAdjacentElement("afterbegin", reportsBtn);
        }
    }, 200)

});

async function fetchReports() {
    const data = await apiRequest("admin/reports", "GET", null, true);
    const reports = data.reports || [];

    function escapeHtml(s) {
        if (s === null || s === undefined) return "";
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    let html = `<div id="reports-container" style="max-width:1000px; overflow-y:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;overflow-y:auto;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.08);">
              <th style="padding:8px">ID</th>
              <th style="padding:8px">Server</th>
              <th style="padding:8px">Reporter</th>
              <th style="padding:8px">Reason / Details</th>
              <th style="padding:8px">Status</th>
              <th style="padding:8px">Created</th>
              <th style="padding:8px">Actions</th>
            </tr>
          </thead>
          <tbody>`;

    for (const r of reports) {
        const serverLabel = r.server_url ? `${r.server_id} — ${truncateString(r.server_url, 40)}` : String(r.server_id);
        const reporter = escapeHtml(r.reporter_email || "—");
        const details = r.details ? escapeHtml(truncateString(r.details, 120)) : "";
        const status = escapeHtml(r.status || "open");
        const created = escapeHtml(r.created_at || "");
        html += `<tr data-report-id="${r.id}" style="border-bottom:1px solid rgba(255,255,255,0.03);">
          <td style="padding:8px; vertical-align:top;">${r.id}</td>
          <td style="padding:8px; vertical-align:top;"><a href="${r.server_url ? escapeHtml(r.server_url) : '#'}" target="_blank" style="color:inherit;text-decoration:underline">${escapeHtml(serverLabel)}</a></td>
          <td style="padding:8px; vertical-align:top;">${reporter}</td>
          <td style="padding:8px; vertical-align:top;"><strong>${escapeHtml(r.reason)}</strong><div style="margin-top:6px;color:rgba(255,255,255,0.75)">${details}</div></td>
          <td style="padding:8px; vertical-align:top;">${status}</td>
          <td style="padding:8px; vertical-align:top;">${created}</td>
          <td style="padding:8px; vertical-align:top; white-space:nowrap;">
            <button class="report-action-btn" data-id="${r.id}" data-action="in_progress" style="margin-right:6px;">Take</button>
            <button class="report-action-btn" data-id="${r.id}" data-action="close" style="margin-right:6px;">Close</button>
            <button class="report-action-btn" data-id="${r.id}" data-action="open" style="margin-right:6px;">Reopen</button>
            <button class="report-details-btn" data-id="${r.id}" data-server-url="${escapeHtml(r.server_url || '')}" style="margin-left:6px;">Details</button>
          </td>
        </tr>`;
    }

    html += `</tbody></table></div>`;

    customPrompts.showPrompt("Reports", html, null, ["Close", ""]);
    const container = document.getElementById("reports-container");
    if (!container) return;

    container.addEventListener("click", async (e) => {
        const actionBtn = e.target.closest(".report-action-btn");
        if (actionBtn) {
            const id = actionBtn.dataset.id;
            const action = actionBtn.dataset.action;
            try {
                actionBtn.disabled = true;
                await apiRequest(`admin/reports/${id}/action`, "POST", {action}, true);
                customPrompts.close && typeof customPrompts.close === "function" && customPrompts.close();
                await fetchReports();
            } catch (err) {
                actionBtn.disabled = false;
                console.error(err);
                alert(err?.message || "Action failed");
            }
            return;
        }

        const detailsBtn = e.target.closest(".report-details-btn");
        if (!detailsBtn) return;
        const reportId = detailsBtn.dataset.id;
        const serverUrl = detailsBtn.dataset.serverUrl || "";

        const tr = container.querySelector(`tr[data-report-id="${reportId}"]`);
        if (!tr) return;

        const nextRow = tr.nextElementSibling;
        if (nextRow && nextRow.classList && nextRow.classList.contains("report-details-row")) {
            nextRow.remove();
            return;
        }

        let sd = null;
        if (serverUrl) {
            try {
                sd = await getServerData(serverUrl);
            } catch (err) {
                sd = null;
            }
        }

        if (!sd) {
            sd = {
                serverinfo: {
                    name: "Unknown",
                    about: "",
                    version: 0,
                    ssl: false,
                    tenor: false,
                    turn: false,
                    slots: {online: 0, limit: 0, reserved: 0},
                    connection_error: true,
                    banner: ""
                }
            };
        }

        const info = sd.serverinfo || {};
        const bannerUrl = info.banner ? (serverUrl ? (serverUrl.replace(/\/$/, "") + info.banner) : info.banner) : "";
        let aboutEsc = sanitizeHtmlForRender(String(info.about || ""));
        const nameEsc = escapeHtml(String(info.name || ""));
        const versionText = escapeHtml(String(String(info.version).split("") || "").replaceAll(",", "."));
        const features = [];
        if (info.ssl) features.push("TLS");
        if (info.tenor) features.push("Tenor GIFs");
        if (info.turn) features.push("TURN");
        if (info.connection_error) features.push("Connection error");

        const featureHtml = features.length ? features.map(f => `<span style="display:inline-block;padding:4px 8px;margin:4px;background:rgba(255,255,255,0.03);border-radius:6px;font-size:12px">${escapeHtml(f)}</span>`).join("") : "";


        const detailsHtml = `
          <tr class="report-details-row">
            <td colspan="7" style="padding:12px 8px; background: rgba(255,255,255,0.02);">
              <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="flex:0 0 220px;">
                  <div style="width:220px;height:120px;border-radius:8px;overflow:hidden;background:#222;background-size:cover;background-position:center;${bannerUrl ? `background-image:url('${escapeHtml(bannerUrl)}')` : ""}"></div>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                    <h3 style="margin:0;font-size:16px;">${nameEsc}</h3>
                    <div style="font-size:13px;color:rgba(255,255,255,0.75)">Version ${versionText}</div>
                    <a href="${serverUrl ? escapeHtml(serverUrl) : '#'}" target="_blank" style="margin-left:auto;text-decoration:underline;color:inherit">Open</a>
                  </div>
                  <div style="margin-bottom:8px;color:rgba(255,255,255,0.85);">${aboutEsc}</div>
                  <div style="margin-bottom:8px;">${featureHtml}</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.75)">
                    Online: ${info.slots?.online ?? 0} / ${info.slots?.limit ?? 0} • ${info.slots?.reserved ?? 0} reserved
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;

        tr.insertAdjacentHTML("afterend", detailsHtml);
    });
}


function truncateString(value, length) {
    if (!value || typeof value !== "string") return value || "";
    if (value.length <= length) return value;
    return value.slice(0, length - 2) + "..";
}

function getReportButton(server, inline = false) {
    const btn = `
    <button
      class="admin-btn"
      title="Report"
      data-action="report"
      data-id="${server.id}"
      aria-label="Report server"
      data-inline-action="1"
      onclick="reportServerPrompt(${server.id})"
      style="padding:6px; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center;"
    >
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 24 24"
           width="16"
           height="16"
           aria-hidden="true"
           focusable="false"
           fill="none"
           stroke="#fff"
           stroke-width="1.6"
           stroke-linecap="round"
           stroke-linejoin="round">
        <polygon points="12,3 21,20 3,20" fill="none"/>
        <line x1="12" y1="7.5" x2="12" y2="13.2"/>
        <circle cx="12" cy="16.2" r="0.9" fill="none"/>
      </svg>
    </button>
  `;

    if (inline) {
        return btn;
    }

    return `
    <div class="server-actions">
      ${btn}
    </div>
  `;
}
