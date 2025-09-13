function refreshAfterAdmin() {
    const v = getView();
    if (v === "pending") return fetchPendingServers();
    if (v === "mine") return fetchMyServers();
    return fetchServers();
}

async function doUnapprove(id) {
    await apiRequest(`/servers/${id}/unapprove`, "POST", {}, true);
    return refreshAfterAdmin();
}

async function doApprove(id) {
    if (typeof approveServerPrompt === "function") {
        await approveServerPrompt(id);
        return;
    }
    await apiRequest(`/servers/${id}/approve`, "POST", {}, true);
    return refreshAfterAdmin();
}

async function doDenyPrompt(id) {
    if (typeof denyServerPrompt === "function") return denyServerPrompt(id);
    await apiRequest(`/servers/${id}/deny`, "POST", {}, true);
    return refreshAfterAdmin();
}

async function doBlockPrompt(id) {
    if (typeof blockServerPrompt === "function") return blockServerPrompt(id);
    await apiRequest(`/servers/${id}/block`, "POST", {}, true);
    return refreshAfterAdmin();
}

function makeAdminControls(server) {
    if (!isAdmin()) return "";
    return `
    <div class="admin-actions">
      <button class="admin-btn" data-inline-action="1" title="Approve" onclick="doApprove(${server.id})" aria-label="Approve server ${server.id}">
        <svg viewBox="0 0 24 24"><path d="M9 16.17l-3.88-3.88L4 13.41 9 18.41 20 7.41 18.59 6l-9.59 9.59z"/></svg>
      </button>
      <button class="admin-btn" data-inline-action="1" title="Unapprove" onclick="doUnapprove(${server.id})" aria-label="Unapprove server ${server.id}">
        <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
      </button>
      <button class="admin-btn" data-inline-action="1" title="Reject" onclick="doDenyPrompt(${server.id})" aria-label="Deny server ${server.id}">
        <svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM9 10h6v2H9z"/></svg>
      </button>
      <button class="admin-btn" data-inline-action="1" title="Block" onclick="doBlockPrompt(${server.id})" aria-label="Ban server ${server.id}">
        <svg viewBox="0 0 24 24"><path d="M12 2 2 7v6c0 5 3.8 9 10 9s10-4 10-9V7L12 2z"/></svg>
      </button>
    </div>
  `;
}

function makeOwnerButtonsInline(server, showOwnerActions = false, includeReport = false) {
    if (!showOwnerActions && !includeReport) return "";

    let html = "";

    if (showOwnerActions) {
        html += `
      <button class="action-btn" data-inline-action="1" title="Edit"
              onclick="editServerPrompt(${server.id})" aria-label="Edit server ${server.id}">
        <svg viewBox="0 0 24 24">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM17.71 7.21a1 1 0 000-1.42l-2.5-2.5a1 1 0 00-1.42 0L12.13 5.5l3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
      <button class="action-btn" data-inline-action="1" title="Delete"
              onclick="deleteServerPrompt(${server.id})" aria-label="Delete server ${server.id}">
        <svg viewBox="0 0 24 24">
          <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    `;
    }

    if (includeReport) {
        html += getReportButton(server, /* inline */ true);
    }

    return html;
}


function makeOwnerControls(server, showOwnerActions = false,  includeReport = false) {
    if (!showOwnerActions && !includeReport) return "";
    return `
    <div class="server-actions">
      ${showOwnerActions ? `
        <button class="action-btn" data-inline-action="1" title="Edit" onclick="editServerPrompt(${server.id})" aria-label="Edit server ${server.id}">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM17.71 7.21a1 1 0 000-1.42l-2.5-2.5a1 1 0 00-1.42 0L12.13 5.5l3.75 3.75 1.83-1.83z"/></svg>
        </button>
        <button class="action-btn" data-inline-action="1" title="Delete" onclick="deleteServerPrompt(${server.id})" aria-label="Delete server ${server.id}">
          <svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      ` : ``}
      ${includeReport ? getReportButton(server, true) : ``}
    </div>
  `;
}

function makeAdminButtonsInline(server) {
    if (!isAdmin()) return "";
    return `
    <button class="admin-btn" data-inline-action="1" title="Approve" onclick="doApprove(${server.id})">
      <svg viewBox="0 0 24 24"><path d="M9 16.17l-3.88-3.88L4 13.41 9 18.41 20 7.41 18.59 6l-9.59 9.59z"/></svg>
    </button>
    <button class="admin-btn" data-inline-action="1" title="Unapprove" onclick="doUnapprove(${server.id})">
      <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
    </button>
  `;
}