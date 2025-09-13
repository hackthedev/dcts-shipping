// modules/functions/addon.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

export class Addon {
    static configPath = path.join(ROOT, "plugins", "settings.json");
    static addonConfig = Addon.loadConfig();

    static loadConfig() {
        try { return JSON.parse(fs.readFileSync(Addon.configPath, "utf8")); }
        catch {
            try { fs.mkdirSync(path.dirname(Addon.configPath), { recursive: true }); } catch {}
            try { fs.writeFileSync(Addon.configPath, JSON.stringify({}, null, 2)); } catch {}
            return {};
        }
    }

    static getSetting(addonName, keyPath) {
        if (!addonName || !keyPath) return undefined;

        const parts = keyPath.split(".");
        let cur = Addon.addonConfig[addonName];
        if (cur == null) return undefined;

        for (const p of parts) {
            if (cur == null || typeof cur !== "object") return undefined;
            cur = cur[p];
        }

        return cur;
    }

    static registerSetting(addonName, keyPath, defaultValue) {
        if (!addonName || !keyPath) throw new TypeError("addonName and keyPath required");

        Addon.addonConfig[addonName] ??= {};
        const parts = keyPath.split(".");
        let cur = Addon.addonConfig[addonName];

        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            cur[p] ??= {};
            cur = cur[p];
        }

        const last = parts.at(-1);
        if (cur[last] === undefined) cur[last] = defaultValue;
        try { fs.writeFileSync(Addon.configPath, JSON.stringify(Addon.addonConfig, null, 2)); } catch {}
        return cur[last];
    }

    static extractCallbackBody(cb) {
        const s = cb.toString();
        const m = s.match(/^[\s\S]*?\{([\s\S]*)\}\s*$/);
        if (m && m[1] !== undefined) return m[1].replace(/^\s*\n/, "").replace(/\n\s*$/, "");
        const a = s.match(/^[^(]*\([^)]*\)\s*=>\s*([^{}][\s\S]*)$/);
        if (a && a[1]) return "return " + a[1].trim().replace(/;$/, "") + ";";
        return s;
    }

    static createPatchedSource(originalFn, markerText, position = "below", patchFn) {
        if (typeof originalFn !== "function") throw new TypeError("originalFn must be a function");
        if (typeof markerText !== "string" || markerText.length === 0) throw new TypeError("markerText required");
        if (typeof patchFn !== "function") throw new TypeError("patchFn must be a function");

        const base = originalFn.__patchedSource || originalFn.toString();
        const idx = base.indexOf(markerText);
        if (idx === -1) throw new Error(`marker "${markerText}" not found`);

        // locate marker line
        const lines = base.split(/\r?\n/);
        let charCount = 0;
        let markerLine = -1;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= idx) { markerLine = i; break; }
            charCount += lines[i].length + 1;
        }
        if (markerLine === -1) markerLine = lines.findIndex(l => l.includes(markerText));
        if (markerLine === -1) throw new Error("failed to locate marker line");

        const insertLine = position === "above" ? markerLine : markerLine + 1;
        const indentMatch = lines[markerLine].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : "";

        const body = this.extractCallbackBody(patchFn);
        const injectedLines = body.split(/\r?\n/).map(l => (l.trim().length === 0 ? "" : indent + l));
        const newLines = [...lines.slice(0, insertLine), ...injectedLines, ...lines.slice(insertLine)];
        return newLines.join("\n");
    }
}
