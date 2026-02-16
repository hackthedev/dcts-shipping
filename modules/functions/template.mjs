import {getFreshConfig, reloadConfig, versionCode} from "../../index.mjs";
import {generateId} from "./main.mjs";

// templateMiddleware.mjs
export function registerTemplateMiddleware(app, __dirname, fs, path, serverconfig) {
    const publicDir = path.join(__dirname, 'public');
    const templateExtensions = ['.html', '.js'];

    function getMetaTitle(groupId, categoryId, channelId) {
        try {
            let channelName = serverconfig.groups[groupId].channels.categories[categoryId].channel[channelId].name;
            return `Chat ${ channelName ? `in #${channelName} » ${serverconfig.serverinfo.name}` : `on ${serverconfig.serverinfo.name}`}`;
        } catch {
            return `Join the conversation on ${serverconfig.serverinfo.name}`;
        }
    }

    function getMetaDescription(groupId, categoryId, channelId) {

        if (groupId !== null && categoryId !== null && channelId !== null) {
            // get channel specific description
            return getChannelSpecificDescription(groupId, categoryId, channelId);
        }

        if (groupId !== null && categoryId === null && channelId === null) {
            // get category specific description
            return getCategorySpecificDescription(groupId, categoryId, channelId);
        }

        if (groupId !== null && categoryId === null && channelId === null) {
            // get group specific description
            return getGroupSpecificDescription(groupId, categoryId, channelId);
        }

        return "Join now and chat with others!";
    }

    function getChannelSpecificDescription(groupId, categoryId, channelId) {
        try {
            return `Join the conversation on ${serverconfig.serverinfo.name} and chat in #${serverconfig.groups[groupId].channels.categories[categoryId].channel[channelId].name}`;
        } catch {
            return `Join the conversation on ${serverconfig.serverinfo.name}`;
        }
    }

    function getCategorySpecificDescription(groupId, categoryId) {
        try {
            return `Check out #${serverconfig.groups[groupId].channels.categories[categoryId].info.name} on ${serverconfig.serverinfo.name}`;
        } catch {
            return `Join the conversation on ${serverconfig.serverinfo.name}`;
        }
    }

    function getGroupSpecificDescription(groupId, categoryId) {
        try {
            return `Check out ${serverconfig.groups[groupId].info.name} on ${serverconfig.serverinfo.name}`;
        } catch {
            return `Join the conversation on ${serverconfig.serverinfo.name}`;
        }
    }


    function renderTemplate(template, query) {
        const { group, category, channel } = query;

        let config = getFreshConfig();

        let placeholders = [
            ["server.home.banner_url", () => config.serverinfo.home.banner_url],
            ["server.home.title", () => config.serverinfo.home.title],
            ["server.home.subtitle", () => config.serverinfo.home.subtitle],
            ["server.home.about", () => config.serverinfo.home.about],

            // vc
            ["livekit.url", () => `${process.env.LIVEKIT_URL || config.serverinfo.livekit.url}`],

            ["version", () => versionCode],
            ["random", () => generateId(20)],
            ["default_theme", () => config.serverinfo.defaultTheme || "default.css"],

            ["meta.page.title", () => getMetaTitle(group, category, channel)],
            ["meta.page.description", () => getMetaDescription(group, category, channel)],
            ["server.name", () => config.serverinfo.name || "No Server Name found"],
            ["group", () => config.groups[group].info.name || "No Group Provided"],
            ["category", () => config.groups[group].channels.categories[category].info.name || "No Category Provided"],
            ["channel", () => config.groups[group].channels.categories[category].channel[channel].name || "No Channel Provided"],
        ];

        return template.replace(/{{\s*([^{}\s]+)\s*}}/g, (match, key) => {
            const found = placeholders.find(([name]) => name === key);
            return found ? found[1]() : '';
        });
    }

    app.use((req, res, next) => {
        let reqPath = req.path === '/' ? '/index.html' : req.path;
        const ext = path.extname(reqPath).toLowerCase();

        if (!templateExtensions.includes(ext)) return next();

        const fullPath = path.join(publicDir, reqPath);

        fs.readFile(fullPath, 'utf8', (err, content) => {
            if (err) return next();

            const rendered = renderTemplate(content, req.query);
            const contentType = {
                '.html': 'text/html',
                '.js': 'application/javascript',
            }[ext] || 'text/plain';

            res.setHeader('Content-Type', contentType);
            res.send(rendered);
        });
    });
}
