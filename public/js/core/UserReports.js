class UserReports {
    static reportMessage(messageId, type = "message", plainText = null) {

        messageId = messageId.replace("msg-", "");
        messageId = messageId.replace("m_", "");
        messageId = parseInt(messageId)

        if (typeof (messageId) !== "number") {
            console.log({ error: "Parameter messageId is not a number" })
            return;
        }

        customPrompts.showPrompt(
            "Report Message",
            `
            <div class="prompt-form-group">
                <label class="prompt-label" for="reportDescription">Report Description</label>
                <input class="prompt-input" type="text" id="tt_reportMessage_reportDescription" name="reportDescription" placeholder="Why are you reporting this message?">
            </div>
            `,
            (values) => {
                socket.emit("createReport", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    targetId: messageId,
                    type,
                    plainText,
                    description: values.reportDescription
                }, function (response) {

                    showSystemMessage({
                        title: response?.msg || response?.error,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 2000
                    });
                });
            },
            ["Report", "error"],
            false,
            250
        );
    }

    static async showMessageLogs(id) {
        return new Promise((resolve, reject) => {

            socket.emit("getMessageLogs", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                msgId: id
            }, function (response) {
                if (response.type === "success") {
                    let parsedLogs = response.logs.map(log => {
                        return JSON.parse(decodeURIComponent(atob(log.message)));
                    });

                    resolve(parsedLogs.reverse());
                } else {
                    reject(response.error);
                }
            });
        });
    }


    static getReports() {
        socket.emit("fetchReports", {
            id: UserManager.getID(),
            token: UserManager.getToken()
        }, function (response) {

            try {
                if (response.type == "success") {
                    let reports = response.reports;
                    ModView.showReports(reports)
                }
            }
            catch (error) {
                console.log(error)
            }
        });
    }
}