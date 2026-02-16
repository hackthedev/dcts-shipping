let mentionAc = null;
let mentionList = [];

function registerMentionClickEvent(){
    ContextMenu.registerClickEvent(
        "mention_channel_click",
        [
            ".mention.channel",
        ],
        async (data) => {
            let channelId = data.element.getAttribute("data-channel-id");
            let groupId = data.element.getAttribute("data-group-id");
            let categoryId = data.element.getAttribute("data-category-id");

            if (!groupId) return;
            if (!categoryId) return;
            if (!channelId) return;

            setUrl(`?group=${groupId}&category=${categoryId}&channel=${channelId}`)
            changedChannel() // updates channel list, server group icon etc
        }
    )
}

async function resolveMentions(message = null, pingUser = false) {
    if (!message?.messageId && !message?.reply) return;
    if(!message?.messageId && message?.reply) message.messageId = message.reply;

    const container = document.querySelector(`.message-container .content:not(.reply)[data-message-id="${message.messageId}"]`);
    if(!container) throw new Error("Message container not found for converting mentions");
    let messageContainer = container.closest(".message-container");
    if (!container) return;

    let replyRow = messageContainer.querySelector(".row.reply");
    if(replyRow){
        let repliedMessageAuthor = replyRow.getAttribute("data-member-id")
        if(repliedMessageAuthor === UserManager.getID()){
            // only mark the first message
            markElementAsMention(container?.parentNode?.firstElementChild, pingUser, message);
        }
    }

    const mentions = container.querySelectorAll("label.mention");
    if (mentions.length <= 0) return;

    for (let mention of mentions) {
        const userId = UserManager.getID();

        if (mention.getAttribute("data-member-id") === userId) {
            markElementAsMention(mention.closest(".content"), pingUser, message);
        } else if (mention.getAttribute("data-role-id")) {
            let ownUserRoles = await ChatManager.resolveMemberRoles(userId);
            if (ownUserRoles?.includes(mention.getAttribute("data-role-id"))) {
                markElementAsMention(mention.closest(".content"), pingUser, message);
            }
        } else {
            mention.style.backgroundColor = "transparent";
        }
    }
}

function markElementAsMention(element, pingUser = false, message){
    if(!element) return;
    element.style.backgroundColor = "rgba(255, 174, 0, 0.12)";
    element.style.borderLeft = "3px solid rgba(255, 174, 0, 0.52)";
    element.style.marginTop = "0px";
    element.style.width = "calc(100% - 8px)";

    if(pingUser){
        playSound("message", 0.5);

        if(message){
            showSystemMessage({
                title: message?.author?.name,
                text: message.message,
                icon: message?.author?.icon,
                img: null,
                type: "neutral",
                duration: 6000,
                onClick: () => {
                    navigateToMessage(message.messageId)
                    closeSystemMessage();
                }
            });
        }
    }
}

function Mention(type, data) {
    this.type = type;
    this.data = data;
}

async function convertMention(message, isString = false) {
    if(!message) throw new Error("Message cannot be converted");

    let text = isString ? message.toString() : message.message.toString();

    const u = await getUserMentions(text);
    text = u.text;

    const r = await getRoleMentions(text);
    text = r.text;

    const c = await getChannelMentions(text);
    text = c.text;

    return {
        text,
        userIds: u.userIds,
        roleIds: r.roleIds,
        channelIds: c.channelIds
    };
}

async function getUserMentions(text) {
    try {
        const userIds = [];
        const matches = [...text.matchAll(/&lt;@(\d+)&gt;/g)];

        for (const match of matches) {
            const id = match[1];
            if (!userIds.includes(id)) userIds.push(id);

            const member = await ChatManager.resolveMember(id);
            if (!member) continue;

            const html = `<label class="mention member" data-member-id="${id}">@${member.name}</label>`;
            text = text.replace(match[0], html);
        }

        return { text, userIds };
    } catch {
        return { text, userIds: [] };
    }
}

async function getRoleMentions(text) {
    try {
        const roleIds = [];
        const matches = [...text.matchAll(/&lt;!@(\d+)&gt;/g)];

        for (const match of matches) {
            const id = match[1];
            if (!roleIds.includes(id)) roleIds.push(id);

            const role = await ChatManager.resolveRole(id);
            if (!role) continue;

            const html = `<label class="mention role" style="color:${role.info.color}" data-role-id="${id}">@${role.info.name}</label>`;
            text = text.replace(match[0], html);
        }

        return { text, roleIds };
    } catch {
        return { text, roleIds: [] };
    }
}

async function getChannelMentions(text) {
    try {
        const channelIds = [];
        const matches = [...text.matchAll(/&lt;#@(\d+)&gt;/g)];

        for (const match of matches) {
            const id = match[1];
            if (!channelIds.includes(id)) channelIds.push(id);

            const channel = await ChatManager.resolveChannel(id);
            if (!channel || channel.error) continue;

            const html = `<label class="mention channel" data-channel-id="${id}" data-group-id="${channel.groupId}"  data-category-id="${channel.categoryId}">#${channel.channel.name}</label>`;
            text = text.replace(match[0], html);
        }

        return { text, channelIds };
    } catch {
        return { text, channelIds: [] };
    }
}

async function getChannelTreeData() {
    return new Promise(resolve => {
        socket.emit("getChannelTree", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            username: UserManager.getUsername(),
            icon: UserManager.getPFP(),
            group: UserManager.getGroup()
        }, function (response) {
            resolve(response);
        });
    });
}

async function updateMentionAutocompleteData() {
    let channeltree = await getChannelTreeData();
    let serverRoles = await ChatManager.resolveServerRoles();
    let serverMembers = await ChatManager.resolveServerMembers();

    let currentGroupCategories = channeltree.data.groups[UserManager.getGroup()].categories;
    let channels = {};

    mentionList = [];
    mentionAc.clear();

    // handle channels
    for (let cat of Object.keys(currentGroupCategories)) {
        let category = currentGroupCategories[cat];
        let categoryChannels = category.channel;
        channels = { ...channels, ...categoryChannels };
    }

    let i = 0;
    for (let channel of Object.values(channels)) {
        const name = channel.name;
        const html = `<span data-channel-id="${channel.id}">#${name}</span>`;

        const mention = new Mention("channel", { channel, html });
        mentionList[i++] = mention;

        mentionAc.addEntry(name, {
            type: "channel",
            channel: { ...channel },
            html
        }, html);
    }

    // handle roles
    for (let roleId of Object.keys(serverRoles)) {
        const role = serverRoles[roleId];
        if (!role?.info) continue;

        const name = role.info.name;
        const html = `<span data-role-id="${roleId}" style="color:${role.info.color}">@${name}</span>`;

        const mention = new Mention("role", { role: { id: roleId, ...role.info }, html });
        mentionList[i++] = mention;

        mentionAc.addEntry(name, {
            type: "role",
            role: { id: roleId, ...role.info },
            html
        }, html);
    }

    // handle server members
    for (let memberId of Object.keys(serverMembers)) {
        const member = serverMembers[memberId];
        if (!member) continue;

        const name = member.name;
        const html = `<img 
                                style="background-color: black;
                                width: 20px; 
                                height: 20px;
                                border-radius: 50%;" 
                                src="${ChatManager.proxyUrl(member?.icon) || "/img/default_icon.png"}"
                                <span data-role-id="${memberId}">@${name}</span>`;

        const mention = new Mention("member", { member: { id: memberId, ...member }, html });
        mentionList[i++] = mention;

        mentionAc.addEntry(name, {
            type: "member",
            member: { id: memberId, ...member },
            html
        }, html);
    }
}

async function initializeMentionAutocomplete(element) {
    if (!mentionAc) {
        mentionAc = new Autocomplete(element, {
            maxHeight: 250,
            offsetY: -50,
            bg: "hsl(from var(--main) h s calc(l * 2) / 100%)",
            color: "hsl(from var(--main) h s calc(l * 10) / 100%)",
            borderColor: "hsl(from var(--main) h s calc(l * 10) / 20%)",
            highlightBg: "hsl(from var(--main) h s calc(l * 2.5))",
            highlightColor: "hsl(from var(--main) h s calc(l * 12) / 100%)"
        });
    }

    await updateMentionAutocompleteData();

    mentionAc.onSelect = item => {
        const range = quill.getSelection(true);
        if (!range) return;

        const text = getTextBeforeCursor();
        const match = text.match(/@([^\s]*)$/);
        if (!match) return;

        const start = range.index - match[0].length;
        const length = match[0].length;

        let insert = "";
        console.log(item)
        if (item?.data?.type === "channel") {
            insert = `<#@${item.data.channel.id}>`;
        } else if (item?.data?.type === "member") {
            insert = `<@${item.data.member.id}>`;
        } else if (item?.data?.type === "role") {
            insert = `<!@${item.data.role.id}>`;
        }

        quill.deleteText(start, length);
        quill.insertText(start, insert);
        quill.setSelection(start + insert.length);

        mentionAc.hide();
        focusEditor();
    };

    startMentionAutocompleteListener();

    document.addEventListener("keydown", e => {
        if (e.key === "Tab" && mentionAc && mentionAc.container.style.display !== "none") {
            e.preventDefault();
            mentionAc.onKey(e);
        }
    }, true);
}

function startMentionAutocompleteListener() {
    document.addEventListener("keydown", e => {
        if (!mentionAc) return;
        mentionAc.onKey(e);
    });

    quill.on("text-change", () => {
        const text = getTextBeforeCursor();
        const match = [...text.matchAll(/@([^\s]*)/g)].pop();
        if (!match) {
            mentionAc.hide();
            return;
        }

        const searchTerm = match[1];
        if (!searchTerm) {
            mentionAc.hide();
            return;
        }

        mentionAc.showFiltered(searchTerm);
    });
}
