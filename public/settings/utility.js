let socket;
let customPrompts;

document.addEventListener("DOMContentLoaded", () => {
    socket = io.connect();
    customPrompts = new Prompt();
})

function findAttributeUp(element, attr, maxDepth = 10) {
    for (let i = 0; i <= maxDepth && element; i++) {
        const val = element.getAttribute?.(attr);
        if (val !== null) return val;
        element = element.parentNode;
    }
    return null;
}

function doInit(callback) {
    socket.emit("userConnected", {
        id: UserManager.getID(), name: UserManager.getUsername(), icon: UserManager.getPFP(),
        status: UserManager.getStatus(), token: UserManager.getToken(),
        aboutme: UserManager.getAboutme(), banner: UserManager.getBanner(),
        pow: {
            solution: localStorage.getItem("pow_solution"),
            challenge: localStorage.getItem("pow_challenge"),
        }
    }, function (response) {
        console.log(response)
        if(!response?.error){
            if (callback) {
                callback();
            }
        }
    });

    initPow(() => {
        if (callback) {
            callback();
        }
    })
}

async function elementImageToBase64(el) {
    let url = null;

    if (el.tagName === "IMG") {
        url = el.src;
    } else {
        const bg = window.getComputedStyle(el).backgroundImage;
        const match = bg.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) url = match[1];
    }

    if (!url) return null;

    const res = await fetch(url);
    const blob = await res.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

let currentpage;
const pageJsPromises = {};

async function loadPageContent(page = "server-info") {
    if (currentpage === page) return;
    currentpage = page;

    const content = document.getElementById("content");
    const cacheBust = Date.now();

    content.style.transition = "opacity 150ms ease";
    content.style.opacity = "0";
    await new Promise(r => setTimeout(r, 160));

    content.innerHTML = "";

    document.querySelectorAll("link[data-page]").forEach(l => l.remove());

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `page/${page}/${page}.css?v=${cacheBust}`;
    css.dataset.page = page;

    await new Promise(res => {
        css.onload = res;
        document.head.appendChild(css);
    });

    const html = await fetch(`page/${page}/${page}.html?v=${cacheBust}`).then(r => r.text());
    content.innerHTML = html;

    if (!pageJsPromises[page]) {
        pageJsPromises[page] = new Promise(res => {
            const js = document.createElement("script");
            js.src = `page/${page}/${page}.js`;
            js.onload = res;
            document.body.appendChild(js);
        });
    }

    await pageJsPromises[page];

    document.dispatchEvent(
        new CustomEvent("pagechange", { detail: { page } })
    );

    requestAnimationFrame(() => {
        content.style.opacity = "1";
    });

    setUrl(`?page=${page}`)
}

function setUrl(param) {
    const url = new URL(window.location.href);

    const params = new URLSearchParams(param.startsWith("?") ? param.slice(1) : param);

    for (const [key, value] of params.entries()) {
        url.searchParams.set(key, value);
    }

    window.history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());
}

function getUrlParams(param) {
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}


async function showSaveSettings(callback, text = "Unsaved Settings!") {
    if(!callback) throw new Error("No callback provided");

    let settingsContainer = document.querySelector(".settings-save-container");
    if(!settingsContainer){
        settingsContainer = document.createElement("div");
        settingsContainer.classList.add("settings-save-container");
        document.body.appendChild(settingsContainer);
    }

    settingsContainer.innerHTML = `
        <div class="settings-save-container-inner">
            <div class="settings-save-container-inner-text">
                ${text} 
            </div>
        </div>
    `;

    settingsContainer.classList.add("shown");
    settingsContainer.onclick = async () => {
        try{
            await callback();
        }
        catch(e){
            console.error(e);
        }
        closeSettingsPrompt()
    };
}

function checkJsonChanges(jsonObject, stringifiedOriginal){
    if(!jsonObject) throw new Error("No JSON Object supplied in checkChanges");

    if(JSON.stringify(jsonObject) !== stringifiedOriginal){
        return true;
    }
    else{
        closeSettingsPrompt();
        return false;
    }
}


function closeSettingsPrompt(){
    let settingsContainer = document.querySelector(".settings-save-container");
    if(!settingsContainer) return;

    settingsContainer.classList.remove("shown");
    setTimeout(() => {
        settingsContainer.remove();
    }, 200);
}


function chooseRole(arg = {}) {
    let opts = {};
    if (Array.isArray(arg)) opts = {multi: true, preselected: arg};
    else opts = arg;

    const {multi = false, preselected = []} = opts;

    return new Promise((resolve) => {
        socket.emit("getAllRoles", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            group: UserManager.getGroup()
        }, (res) => {
            const roles = res.data;
            let firstCheckedDone = false;

            const preselectedIds = preselected.map(r => String(typeof r === "object" ? r.id : r));

            const items = Object.keys(roles).map(k => {
                const r = roles[k].info;
                if (Number(r.id) === 1) return "";

                const isPreselected = preselectedIds.includes(String(r.id));
                const preset = multi
                    ? (isPreselected || r.hasRole == 1 ? 'checked' : '')
                    : ((!firstCheckedDone && (isPreselected || r.hasRole == 1))
                        ? (firstCheckedDone = true, 'checked')
                        : '');

                return `
                  <div class="role-menu-entry" style="display:flex;align-items:center;gap:8px;margin:6px 0;padding:6px 8px;border-radius:6px;">
                    <input type="checkbox" id="role_${r.id}" name="role_${r.id}" ${preset}
                           class="role-menu-entry-checkbox" style="margin:0;">
                    <label for="role_${r.id}" style="cursor:pointer;color:${r.color};user-select:none;">${r.name}</label>
                  </div>`;
            }).join("");


            const html = `
        <div id="role-chooser" style="min-width:400px;">
          <input id="role-search" type="text" placeholder="Search roles"
                 style="width:100%;box-sizing:border-box;margin:0 0 12px 0;padding:8px 10px;border:1px solid #626262;border-radius:4px;background:transparent;color:#ccc;">
          <div id="role-menu-list" style="max-height:320px;overflow:auto;padding-right:4px;">
            ${items}
          </div>
        </div>`;

            const p = window.__prompt || (window.__prompt = new Prompt());
            p.showPrompt(`Choose ${multi ? "roles" : " a role"}`, html, (vals) => {
                const out = {roles: {}};
                Object.keys(roles).forEach(k => {
                    const r = roles[k].info;
                    if (!!vals[`role_${r.id}`]) {
                        out.roles[r.id] = {id: r.id, name: r.name, color: r.color, hasRole: 1};
                    }
                });
                resolve(out);
            }, ["Choose", null], multi, 400);

            const container = document.getElementById("role-chooser");
            const listEl = container.querySelector("#role-menu-list");
            const searchEl = container.querySelector("#role-search");

            searchEl.addEventListener("input", () => {
                const q = searchEl.value.toLowerCase().trim();
                listEl.querySelectorAll(".role-menu-entry").forEach(entry => {
                    const name = entry.querySelector("label").textContent.toLowerCase();
                    entry.style.display = name.includes(q) ? "flex" : "none";
                });
            });

            if (!multi) {
                listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener("change", function () {
                        if (this.checked) {
                            listEl.querySelectorAll('input[type="checkbox"]').forEach(el => {
                                if (el !== this) el.checked = false;
                            });
                        }
                    });
                });
            }
        });
    });
}
