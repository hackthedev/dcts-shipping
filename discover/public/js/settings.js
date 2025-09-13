const SETTINGS_KEY = "ui_settings";
const DEFAULT_SETTINGS = { compactView: false };

function getSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function setSettings(next) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...next }));
}

function openSettingsPrompt() {
    const s = getSettings();
    const html = `
    <div style="display:grid; gap:12px; min-width:320px">
      <label style="display:flex; align-items:center; gap:8px;">
        <input id="set-compact" type="checkbox" ${s.compactView ? "checked" : ""}>
        Default: Compact View
      </label>
    </div>
  `;
    customPrompts.showPrompt(
        "Settings",
        html,
        async () => {
            const compact = document.getElementById("set-compact").checked;
            setSettings({ compactView: compact });

            try {
                const v = typeof getView === "function" ? getView() : "public";
                if (v === "pending" && typeof fetchPendingServers === "function")      await fetchPendingServers();
                else if (v === "mine" && typeof fetchMyServers === "function")        await fetchMyServers();
                else if (typeof fetchServers === "function")                          await fetchServers();
            } catch {}
            return true;
        },
        ["Save", null]
    );
}
