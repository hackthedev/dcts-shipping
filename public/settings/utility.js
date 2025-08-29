async function loadPageContent(page = "server-info", { force = false } = {}) {
  try {
    const cssHref = `page/${page}/${page}.css`;
    const jsSrc = `page/${page}/${page}.js`;

    if (force) {
      document.querySelectorAll(`script[data-page-script="${jsSrc}"]`).forEach(s => s.remove());
      document.querySelectorAll(`link[rel="stylesheet"][href="${cssHref}"]`).forEach(l => l.remove());
    }

    if (!document.querySelector(`link[rel="stylesheet"][href="${cssHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }

    const res = await fetch(`page/${page}/${page}.html`);
    if (!res.ok) throw new Error(`Failed to load HTML for ${page}`);
    document.getElementById("content").innerHTML = await res.text();

    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = jsSrc;
      s.dataset.pageScript = jsSrc;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${jsSrc}`));
      document.body.appendChild(s);
    });

  } catch (err) {
    console.error("Error loading page content:", err);
    document.getElementById("content").innerHTML = "<p>Failed to load content.</p>";
  }
}

function chooseRole({ multi = false } = {}) {

  return new Promise((resolve) => {
    socket.emit("getAllRoles", {
      id: UserManager.getID(),
      token: UserManager.getToken(),
      group: UserManager.getGroup()
    }, (res) => {


      const roles = res.data;

      let firstCheckedDone = false;

      const items = Object.keys(roles).map(k => {
        const r = roles[k].info;
        const preset = multi
          ? (r.hasRole == 1 ? 'checked' : '')
          : ((!firstCheckedDone && r.hasRole == 1) ? (firstCheckedDone = true, 'checked') : '');

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

        const out = { roles: {} };
        Object.keys(roles).forEach(k => {
          const r = roles[k].info;
          if (!!vals[`role_${r.id}`]) {
            out.roles[r.id] = { id: r.id, name: r.name, color: r.color, hasRole: 1 };
          }
        });

        resolve(out);

      }, ["Choose", null], multi, 400);

      // Suche + Single-Select
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
              listEl.querySelectorAll('input[type="checkbox"]').forEach(el => { if (el !== this) el.checked = false; });
            }
          });

        });

      }
    });
  });
}

