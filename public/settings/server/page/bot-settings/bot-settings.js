async function loadBots() {
    socket.emit("getBots", {
        id: UserManager.getID(),
        token: UserManager.getToken()
    }, function (res) {
        if (res.type === "success") {
            const botList = document.getElementById("bot-list");
            botList.innerHTML = "";
            res.bots.forEach(bot => {
                const botEl = document.createElement("div");
                botEl.className = "bot-entry";
                botEl.innerHTML = `
                    <div class="bot-info">
                        <img src="${bot.icon || '/img/default_icon.png'}" class="bot-icon">
                        <div class="bot-details">
                            <div class="bot-name">${bot.name} <span style="font-size: 10px; color: gray;">(${bot.id})</span></div>
                            <div class="bot-token" onclick="copyToken('${bot.token}')" title="Click to copy token">Token: ••••••••••••••••••••••</div>
                        </div>
                    </div>
                    <button onclick="deleteBot('${bot.id}')" style="background: indianred; border: none; padding: 5px 10px; border-radius: 4px; color: white; cursor: pointer;">Delete</button>
                `;
                botList.appendChild(botEl);
            });
        }
    });
}

let currentBotIconBase64 = null;

async function previewBotIcon(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        currentBotIconBase64 = e.target.result;
        document.getElementById('bot-icon-preview').src = currentBotIconBase64;
    };
    reader.readAsDataURL(file);
}

function createBot() {
    const nameInput = document.getElementById("bot-name-input");
    const name = nameInput.value.trim();
    if (!name) {
        showSystemMessage({ title: "Error", text: "Please enter a bot name.", type: "error" });
        return;
    }

    socket.emit("createBot", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        name: name,
        icon: currentBotIconBase64
    }, function (res) {
        if (res.type === "success") {
            nameInput.value = "";
            currentBotIconBase64 = null;
            document.getElementById('bot-icon-preview').src = "/img/default_icon.png";
            showSystemMessage({ title: "Success", text: "Bot created successfully. Remember to copy the token!", type: "success" });
            loadBots();
        } else {
            showSystemMessage({ title: "Error", text: res.error || "Failed to create bot.", type: "error" });
        }
    });
}

function deleteBot(botId) {
    if (confirm("Are you sure you want to delete this bot? This action cannot be undone.")) {
        socket.emit("deleteBot", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            botId: botId
        }, function (res) {
            if (res.type === "success") {
                showSystemMessage({ title: "Success", text: "Bot deleted.", type: "success" });
                loadBots();
            } else {
                showSystemMessage({ title: "Error", text: res.error || "Failed to delete bot.", type: "error" });
            }
        });
    }
}

function copyToken(token) {
    navigator.clipboard.writeText(token).then(() => {
        showSystemMessage({ title: "Copied", text: "Bot token copied to clipboard.", type: "success" });
    });
}

document.addEventListener("pagechange", e => {
    if (e.detail.page === "bot-settings") {
        loadBots();
    }
});
