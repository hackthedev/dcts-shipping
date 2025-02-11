class UserReports {
    static reportMessage(messageId) {

        messageId = messageId.replace("msg-", "");
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
                    type: "message",
                    description: values.reportDescription
                }, function (response) {
        
                    showSystemMessage({
                        title: response.msg,
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

    static getReports() {
        socket.emit("fetchReports", {
            id: UserManager.getID(),
            token: UserManager.getToken()
        }, function (response) {
            console.log(response)

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