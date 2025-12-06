class ChatManager {

    static showedGlitch = false;
    static connectionLost = false;
    static wasConnected = false;

    static applyThemeOnLoad(theme, accent) {
        if (!theme) return;

        // if the server theme is not the default theme,
        // and the user has not set his own theme
        // then we apply the server default theme
        let serverDefaultTheme = "{{default_theme}}";
        if(serverDefaultTheme !== "default.css" && theme === "default.css"){
            theme = serverDefaultTheme.split(".css")[0];
        }

        // apply accent before theme
        if(accent) document.documentElement.style.setProperty('--main', accent);

        // dont need to reimport it
        if(theme === "default.css") return;

        let link = document.querySelector('link[data-theme]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.dataset.theme = "active";
            document.head.appendChild(link);
        }

        link.href = `/css/themes/${theme}/${theme}.css`;
        console.log("Applied theme: ", theme)
    }

    static async checkConnection(delay) {
        setInterval(() => {
            if (socket.connected === false && ChatManager.showedGlitch === false && ChatManager.wasConnected === true) {
                ChatManager.showedGlitch = true;
                ChatManager.connectionLost = true;

                hackerGlitch(
                    document.body,
                    {
                        text: "Connection lost",
                        intensity: 0.75,
                        bgAlpha: 1,
                        useSnapshot: true
                    }
                )
            }

            if (socket.connected === true && ChatManager.connectionLost === true) {
                window.location.reload();
            }

            if (socket.connected === true && ChatManager.wasConnected === false) {
                ChatManager.wasConnected = true;
            }
        }, delay)
    }

    static async srcToFile(src) {
        if (!src || typeof src !== "string")
            return { ok: false, error: "invalid_src" };

        try {
            const r = await fetch(src);
            if (!r.ok)
                return { ok: false, error: "fetch_failed", status: r.status };

            const blob = await r.blob();
            const ext = blob.type.split("/")[1] || "bin";
            const filename = `${UserManager.generateId(12)}.${ext}`;
            const file = new File([blob], filename, { type: blob.type });

            const res = await ChatManager.uploadFile([file]);
            return res;
        } catch (err) {
            console.error("srcToFile error:", err);
            return { ok: false, error: "srcToFile_failed" };
        }
    }


    static async uploadFile(files, type = "upload") {
        const file = files[0];
        const chunkSize =  1024 * 256; // 256kb
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = crypto.randomUUID();

        const filename = file.name;
        const id = UserManager.getID();

        let lastPercent = -1;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = file.slice(start, end);

            const arrayBuf = await chunk.arrayBuffer();

            const url = `/upload?` +
                `id=${id}` +
                `&type=${type}` +
                `&filename=${encodeURIComponent(filename)}` +
                `&chunkIndex=${i}` +
                `&totalChunks=${totalChunks}` +
                `&fileId=${fileId}`;

            const res = await fetch(url, {
                method: "POST",
                body: arrayBuf
            });

            const json = await res.json();

            if (!json.ok)
                return json;

            const percent = Math.round(((i + 1) / totalChunks) * 100);
            if (percent !== lastPercent) {
                lastPercent = percent;

                if(window?.showSystemMessage){
                    showSystemMessage({
                        title: `Uploading file... ${percent}%`,
                        text: ``,
                        icon: "info",
                        type: "neutral",
                        duration: 1500
                    });
                }
            }

            if (json.ok && json.path) {
                if(window?.showSystemMessage){
                    showSystemMessage({
                        title: "File uploaded",
                        text: "",
                        icon: "info",
                        type: "success",
                        duration: 2000
                    });
                }
                return json;
            }
        }

        return { ok: false, error: "unknown_upload_error" };
    }



    static async resolveMember(memberId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveMember", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: memberId
            }, function (response) {
                resolve(response?.data);
            })
        })
    }

    static async resolveRole(roleId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveRole", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: roleId
            }, function (response) {
                resolve(response?.data);
            })
        })
    }


    static getChannelMarkerCounter(channelId) {
        if (!String(channelId)) {
            console.error("Couldnt get channel marker as channel id wasnt set")
            return;
        }
        return Number(localStorage.getItem(`message-marker-${channelId}`))
    }

    static setChannelMarkerCounter(channelId, counter) {
        if (!String(channelId)) {
            console.error("Couldnt save channel marker as channel id wasnt set")
            return;
        }

        // if we supply nothing lets just set the current channel msg count
        if (!counter) {
            let channelElement = ChatManager.getChannelElementById(channelId);
            if (!channelElement) {
                console.error("couldnt udpate channel marker count as the channel element wasnt found");
                return
            }

            counter = channelElement.getAttribute("data-message-count");
        }

        localStorage.setItem(`message-marker-${channelId}`, counter)
    }

    static decreaseChannelMarkerCount(channelId) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt decrease channel marker count as the channel element wasnt found");
            return
        }

        let msgCount = Number(channelElement.getAttribute("data-message-count"));
        if (!msgCount) {
            console.error("Couldnt decrease channel marker counter as counter attribute wasnt found")
            return;
        }

        // decrease counter and update
        msgCount--;
        channelElement.setAttribute("data-message-count", String(msgCount))
    }

    static increaseChannelMarkerCount(channelId) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt increase channel marker count as the channel element wasnt found");
            return
        }

        let msgCount = Number(channelElement.getAttribute("data-message-count"));
        if (!msgCount) {
            console.error("Couldnt increase channel marker counter as counter attribute wasnt found")
            return;
        }

        // increase counter and update
        msgCount++;
        channelElement.setAttribute("data-message-count", String(msgCount))
    }

    static setChannelMarker(channelId, mark = false) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt set channel marker as the channel element wasnt found", channelId);
            return
        }

        let indicator = channelElement.querySelector(".message-marker-icon");

        if (!channelElement || !indicator) {
            console.error("Couldnt set channel marker because channelelement wasnt found");
        }

        if (mark === true) {
            if (!channelElement.classList.contains("markChannelMessage")) channelElement.classList.add("markChannelMessage");
            indicator.style.display = "block";
        } else {
            if (channelElement.classList.contains("markChannelMessage")) channelElement.classList.remove("markChannelMessage");
            indicator.style.display = "none";
        }
    }

    static getChannelElementById(channelId) {
        if (!String(channelId)) {
            console.error("Couldnt get channel element from id");
            return;
        }

        return document.querySelector(`#channeltree a.channelTrigger[data-channel-id='${channelId}']`);
    }
}