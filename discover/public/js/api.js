const API_BASE = window.location.origin;
const TOKEN_KEY = "jwt_token";

function $(sel, root = document) {
    return root.querySelector(sel);
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

const getToken = () => localStorage.getItem(TOKEN_KEY);
function setView(v){ document.documentElement.dataset.view = v; }
function getView(){ return document.documentElement.dataset.view || "public"; }
function setAdminFlag(b){ document.documentElement.dataset.admin = b ? "1" : "0"; }
function isAdmin(){ return document.documentElement.dataset.admin === "1"; }

async function getAuthInfo(){
    const t = localStorage.getItem("jwt_token");
    if (!t) return { ok:false };
    const r = await fetch(new URL("auth/me", location.origin), { headers: { Authorization:`Bearer ${t}` } });
    if (!r.ok) return { ok:false };
    const j = await r.json().catch(()=>({}));
    return { ok:true, user:j?.user };
}

const isTokenFresh = t => {
    if (!t) return false;
    try {
        const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return !p.exp || (p.exp * 1000 > Date.now());
    } catch {
        return false;
    }
};

async function isLoggedIn() {
    const t = getToken();
    if (!isTokenFresh(t)) return false;
    const r = await fetch(new URL("auth/me", location.origin), {
        headers: {"Authorization": `Bearer ${t}`}
    });
    return r.ok;
}


async function apiRequest(path, method = "GET", data = null, auth = true) {
    const headers = {"Content-Type": "application/json"};
    const token = localStorage.getItem(TOKEN_KEY);
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;

    if(path.substring(0, 1) === "/") path = path.substring(1, path.length)

    const url = new URL(path, API_BASE).toString();
    const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
}


function registerAccount() {
    const html = `
    <div style="display:grid; gap:10px; min-width:280px">
      <p>If you have a server and you want it listed here, create an account.</p>
      <label class="prompt-label">Email<br><input class="prompt-input" id="reg-email" type="email" autocomplete="email" required style="width:100%"></label>
      <label class="prompt-label">Password<br><input class="prompt-input" id="reg-pass" type="password" autocomplete="new-password" required style="width:100%"></label>
      <label class="prompt-label">Repeat Password<br><input class="prompt-input" id="reg-pass2" type="password" autocomplete="new-password" required style="width:100%"></label>
    </div>
  `;
    customPrompts.showPrompt(
        "Register account",
        html,
        async () => {
            const email = val("reg-email");
            const pass = val("reg-pass");
            const pass2 = val("reg-pass2");
            if (!email || !pass || !pass2) throw new Error("Missing fields");
            if (pass !== pass2) throw new Error("Passwords do not match");
            const res = await apiRequest("auth/register", "POST", {email, password: pass}, false);
            if (res?.token) localStorage.setItem(TOKEN_KEY, res.token);
            window.location.reload();
        },
        ["Register", null]
    );
}

function loginAccount() {
    const html = `
    <div style="display:grid; gap:10px; min-width:280px">
      <label class="prompt-label">Email<br><input class="prompt-input" id="login-email" type="email" autocomplete="email" required style="width:100%"></label>
      <label class="prompt-label">Password<br><input class="prompt-input" id="login-pass" type="password" autocomplete="current-password" required style="width:100%"></label>
    </div>
  `;
    customPrompts.showPrompt(
        "Login",
        html,
        async () => {
            const email = val("login-email");
            const password = val("login-pass");
            if (!email || !password) throw new Error("Missing fields");
            const res = await apiRequest("auth/login", "POST", {email, password}, false);
            if (res?.token) localStorage.setItem(TOKEN_KEY, res.token);

            window.location.reload()
        },
        ["Login", "success"]
    );
}

function logoutAccount() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload()
}

function addServerPrompt() {
    const html = `
    <div style="display:grid; gap:10px; min-width:320px">
      <label class="prompt-label">URL<br><input class="prompt-input" id="srv-url" type="url" placeholder="https://example.com" required style="width:100%"></label>
      <label class="prompt-label">Tags (comma separated, 6 max)<br><input class="prompt-input" id="srv-tags" type="text" style="width:100%" placeholder="gaming, dark souls"></label>
    </div>
  `;
    customPrompts.showPrompt(
        "Add Server",
        html,
        async () => {
            const url = val("srv-url");
            const tags = val("srv-tags").split(",").map(s => s.trim()).filter(Boolean);
            await apiRequest("servers", "POST", {url, tags}, true);
            await fetchServers();
            return true;
        },
        ["Add", null]
    );
}

async function editServerPrompt(serverId) {

    let server = await fetchServer(serverId)
    console.log(server)

    const html = `
    <div style="display:grid; gap:10px; min-width:320px">
      <label class="prompt-label">URL<br><input class="prompt-input" id="srv-url" type="url" value="${(server?.url || "").replace(/"/g, '&quot;')}" required style="width:100%"></label>
      <label class="prompt-label">Tags (comma separated)<br><input class="prompt-input" id="srv-tags" type="text" value="${(JSON.parse(server?.tags) || []).join(", ")}" style="width:100%"></label>
    </div>
  `;
    customPrompts.showPrompt(
        "Edit Server",
        html,
        async () => {
            const url = val("srv-url");
            const tags = val("srv-tags").split(",").map(s => s.trim()).filter(Boolean);
            await apiRequest(`servers/${server.id}`, "PUT", {url, tags}, true);
            await fetchServers();
            return true;
        },
        ["Save", null]
    );
}

function setTitle(value){
    const pageTitle = document.getElementById("pageTitle");

    if(pageTitle) pageTitle.innerText = value;
    if(!pageTitle) console.warn("Didnt update page title as it wasnt found")

    document.title = value;
}

async function fetchServers(request = null) {
    setView("public");
    setTitle("All Servers")
    const data = request ? request : await apiRequest("servers", "GET", null, false);
    const servers = Array.isArray(data) ? data : (data?.servers || []);
    await renderServersList(servers, { showOwnerActions:false });
}

async function fetchMyServers() {
    setView("mine");
    setTitle("My Servers")
    const data = await apiRequest("servers/mine", "GET", null, true);
    await renderServersList(data?.servers || [], { showOwnerActions:true });
}

async function fetchServer(serverId) {
    const data = await apiRequest("servers/" + serverId, "GET", null, true);
    return data.server || { }
}


async function fetchPendingServers() {
    setView("pending");
    setTitle("[Admin] Pending Servers")
    const data = await apiRequest("servers/pending", "GET", null, true);
    console.log(data)
    await renderServersList(data?.servers || [], { showOwnerActions:true });
}

function deleteServerPrompt(id) {
    const html = `<div>Delete this server?</div>`;
    customPrompts.showPrompt(
        "Delete Server",
        html,
        async () => {
            await apiRequest(`servers/${id}`, "DELETE", null, true);
            await fetchServers();
            return true;
        },
        ["Yes", "error"]
    );
}

// === Admin Actions ===
function approveServerPrompt(id) {
    const html = `<div>Approve this server for listing?</div>`;
    customPrompts.showPrompt(
        "Approve Server",
        html,
        async () => {
            await apiRequest(`servers/${id}/approve`, "POST", {}, true);
            await fetchServers();
            return true;
        },
        ["Approve", "success"]
    );
}

function denyServerPrompt(id) {
    const html = `
    <div style="display:grid; gap:10px; min-width:300px">
      <div>Deny this server?</div>
      <labelclass="prompt-label">Reason (optional)<br><textarea class="prompt-input" id="deny-reason" rows="3" style="width:100%"></textarea></label>
    </div>`;
    customPrompts.showPrompt(
        "Deny Server",
        html,
        async () => {
            const reason = val("deny-reason");
            await apiRequest(`servers/${id}/deny`, "POST", {reason}, true);
            await fetchServers();
            return true;
        },
        ["Deny", "error"]
    );
}

function blockServerPrompt(id) {
    const html = `
    <div style="display:grid; gap:10px; min-width:300px">
      <div>Block this server?</div>
      <label class="prompt-label">Reason (optional)<br><textarea class="prompt-input" id="block-reason" rows="3" style="width:100%"></textarea></label>
    </div>`;
    customPrompts.showPrompt(
        "Block Server",
        html,
        async () => {
            const reason = val("block-reason");
            await apiRequest(`servers/${id}/block`, "POST", {reason}, true);
            await fetchServers();
            return true;
        },
        ["Block", "error"]
    );
}

