class Inbox {
    static async fetchMessages() {
        return await new Promise((resolve, reject) => {
            socket.emit("fetchInboxMessages", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                onlyUnread: true
            }, async function (response) {
                resolve(response)
            });
        })
    }

    static toggleIndicator(toggle) {
        let indicator = document.querySelector(".headerIcon.inbox #inbox-indicator");
        if (!indicator) {
            console.error("No indicator found for inbox icon");
            return;
        }

        if (toggle === true) {
            indicator.style.visibility = "visible";
        } else {
            indicator.style.visibility = "hidden";
        }
    }

    static getInboxElement() {
        return document.querySelector(".inbox-container");
    }

    static async toggleInbox(toggle) {
        if (toggle === true) return await this.updateInboxMessageEntries();
        if (toggle === false) return this.getInboxElement().style.display = "none";

        this.getInboxElement().style.display === "flex" ? this.getInboxElement().style.display = "none" : this.getInboxElement().style.display = "flex";
    }

    static async markAsRead(inboxId) {
        if (!inboxId) throw new Error("No inbox id provided");

        try {
            let response = await fetch(`/inbox/${inboxId}/read`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: UserManager.getID(), token: UserManager.getToken()})
            })

            let json = await response.json();
            if (response.status === 200) {
                await this.updateInboxMessageEntries();
            } else {
                console.error(json);
            }
        } catch (error) {
            console.error(error);
        }
    }

    static async getInboxMessageEntryHTML() {
        let data = await Inbox.fetchMessages();

        let html = "";
        if (data?.items?.length > 0) {
            for (let item of data.items) {
                let itemData = JSON.parse(item.data);
                let itemType = item.type;

                if (itemType === "message") {
                    let htmlContent = await createMessageContentHTML(item, itemData?.messageId);
                    if (htmlContent) html += htmlContent;
                }
            }
        }

        setTimeout(() => {
            if (html.trim().length > 0) Inbox.toggleIndicator(true);
            if (html.trim().length === 0) Inbox.toggleIndicator(false);
        }, 1)

        async function createMessageContentHTML(item, messageId) {
            let message = await ChatManager.resolveMessage(messageId);
            if (!message) {
                console.error(`Couldnt resolve message for inbox. Message id: ${messageId}`);
                return null;
            }

            if (message?.author?.id === UserManager.getID()) return null;

            let title = (await convertMention(sanitizeHtmlForRender(`<@${message?.author?.id}> mentioned you in <#@${message?.channel}>:`), true)).text;
            if (message?.reply) title = (await convertMention(sanitizeHtmlForRender(`<@${message?.author?.id}> replied to your message in <#@${message?.channel}>:`), true)).text;

            let contentBody = (await (convertMention((message?.message), true))).text;
            contentBody = await text2Emoji(contentBody, true, true)
            contentBody = sanitizeHtmlForRender(contentBody)

            return `
                 <div class="entry" data-inbox-id="${item?.inboxId}" data-message-id="${message.messageId}" data-author-id="${message?.author?.id}">                            
                    <div class="content">                        
                        <div class="headline"> 
                            <img class="avatar" src="${message?.author?.icon ? ChatManager.proxyUrl(message?.author?.icon) : "/img/default_pfp.png"}">
                                ${title}
                        </div>
                        <p>
                            ${contentBody}
                        </p>
                    </div>
                    <div class="actions">
                        <button onclick="Inbox.markAsRead('${item?.inboxId}')">&#10004;</button>
                    </div>
                </div>
            `
        }

        return html || "<label>No new messages :)</label>";
    }

    static async updateInboxMessageEntries() {
        this.getInboxElement().querySelector(".inbox-content").innerHTML = await this.getContentHTML(true);
    }

    static async getContentHTML(contentOnly = false) {
        if(contentOnly) return await this.getInboxMessageEntryHTML();

        return ` <div class="inbox-container">
                     <div class="inbox-header">
                        <h2>Inbox</h2>
                     </div>
                         
                       <div class="inbox-content">
                            ${await this.getInboxMessageEntryHTML()}
                           
                       </div>
            
               </div>      
        `;
    }
}