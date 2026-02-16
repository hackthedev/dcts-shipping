class ModView {
    static modViewDiv;
    static modViewDivContent;
    static modViewBadge;
    static reports;
    static didInit = false;

    static addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #modViewDiv {
                width: 60%;
                height: 80%;
                position: fixed;
                top: 10%;
                left: 100%;
                transform: translateX(0);
                z-index: 30;
                background: hsl(from var(--main) h s calc(l * 3) / 90%);
                color: white;
                padding: 20px;
                transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
                opacity: 0;
                border-top-left-radius: 8px;
                border-bottom-left-radius: 8px;
                box-shadow: 10px 10px 13px 0px rgba(0,0,0,0.75);
                border-top: 2px solid var(--primary-bright);
                border-left: 2px solid var(--primary-bright);
                overflow-y: auto;
                overflow-x: hidden;
                
                backdrop-filter: blur(6px);
            }

            #modViewDiv.show {
                transform: translateX(-100%);
                opacity: 1;
            }

            #closeModView, #refreshModView {
                float: right;
                background-color: indianred;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                text-align: center;
                cursor: pointer;
            }

            #refreshModView{
                margin-right: 10px;
                background-color: skyblue;
                color: black;
            }

            .modview_tab {
                display: inline-block;
                padding: 10px;
                cursor: pointer;
                background: hsl(from var(--main) h s calc(l * 5));
                color: white;
                margin-right: 5px;
                border-radius: 5px 5px 0 0;
            }

            .modview_tab.active {
                background: hsl(from var(--main) h s calc(l * 12));
                color: black;
                border: 1px solid #ccc;
                border-bottom: 0;
            }

            .modview_tabnumber {
                width: 20px;
                height: 20px;
                background-color: #abb0be;
                color: black;
                border-radius: 50%;
                margin: 0 6px 0 6px;
                display: inline-block;
                text-align: center;
            }

            .modview_tabnumber.active{
                background-color: hsl(from var(--main) h s calc(l * 3));
                color: white;
            }

            .modview_tab-content {
                display: none;
                background: hsl(from var(--main) h s calc(l * 12));
                color: white;
                padding: 10px;
                border-radius: 5px;
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }

            .modview_tab-content.active {
                display: block;
            }

            table.modview_ {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                background-color: hsl(from var(--main) h s calc(l * 3.5));
            }

            th.modview_, td.modview_ {
                padding: 10px;
                border: 1px solid #555;
                text-align: left;
            }

            th.modview_ {
                background-color: hsl(from var(--main) h s calc(l * 3.5));
            }

            tr.modview_:nth-child(even) {
                background-color: hsl(from var(--main) h s calc(l * 2));
            }

            tr.modview_:hover {
                background: #555;
                cursor: pointer;
            }

            .report-section {
                background: #2a2e35;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 8px;
                border: 1px solid #444;
            }

            .report-section h3 {
                margin-bottom: 8px;
                color: #ddd;
            }

            .user-container {
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }

            .user-section {
                background: #2a2e35;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #444;
                display: flex;
                align-items: center;
                width: 48%;
                margin-bottom: 20px;
            }

            .user-icon {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                margin-right: 10px;
                cursor: pointer;
            }

            .report-info {
                background: #2a2e35;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #444;
                margin-bottom: 10px;
            }

            .modview_message-container {
                background: #2a2e35;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #444;
                margin-top: 10px;
                margin-bottom: 10px;
            }

            .modview_message-box {
                background:rgb(59, 66, 73);
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #555;
            }

            .modview_reportUserNote {
                background-color: #2B3137;
                margin: 0;
                padding: 0;
            }

            .reported-message {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: auto;
            }

            .reported-message span{
                display: block;
                padding: 10px;
            }

            .reported-message p{
                padding: 0;
                margin: 0;
            }

            /* Buttons */
            .action-buttons {
                display: flex;
                gap: 10px;
                margin-top: 10px;
                user-select: none;
                outline: none;
                border: none;
            }

            .action-buttons.center {
                justify-content: center;
            }

            .action-buttons button {
                padding: 8px 12px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                color: white;
                transition: background 0.3s ease-in-out;
            }

            .mute-btn {
                background: #555;
                padding: 10px 15px;
            }

            .mute-btn:hover {
                background: #777;
            }

            .kick-btn {
                background: #e6a700;
                padding: 10px 15px;
            }

            .kick-btn:hover {
                background: #ffbb33;
            }

            .ban-btn {
                background: #d9534f;
                padding: 10px 15px;
            }

            .ban-btn:hover {
                background: #ff6666;
            }

            .delete-btn {
                background: #d9534f;
                padding: 10px 15px;
            }

            .delete-btn:hover {
                background: #ff6666;                
            }

            .back-button {
                display: block;
                width: 100%;
                text-align: center;
                background: hsl(from var(--main) h s calc(l * 5));
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
                border: none;
            }

            .back-button:hover {
                background: #777;
            }

            #modViewBadge {
                position: fixed;
                top: 20px;
                right: 0;
                width: 25px;
                height: auto;
                background-color: var(--error);
                color: white;
                border-radius: 8px 0 0 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                box-shadow: -3px 0 5px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                transition: transform 0.2s ease-in-out, background-color 0.3s;
                padding: 10px 5px;
                /*gap: 5px;*/
            }

            #modViewBadge:hover {
                transform: scale(1.05);
            }

            #modViewBadgeIcon {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                /*margin-bottom: 10px;*/
                background-color: white;
                border-radius: 50%;
                color: black;
                width: 20px;
                height: 20px;
                user-select: none;
            }

            #modViewBadgeText {
                writing-mode: sideways-lr;
                transform-origin: center;
                text-transform: uppercase;
                font-size: 14px;
                font-weight: bold;
                letter-spacing: 10px;
                white-space: nowrap;
                user-select: none;
            }

            /* When count is 0, change color */
            #modViewBadge.empty {
                background-color: gray !important;
            }
        `;
        document.head.appendChild(style);
    }

    static init() {
        if(this.didInit) return;

        this.addStyles();

        this.modViewDiv = document.createElement("div");
        this.modViewDiv.id = "modViewDiv";

        this.modViewDivContent = document.createElement("div");
        this.modViewDivContent.id = "modViewDivContent";
        this.modViewDivContent.innerHTML = ` <label id="closeModView" class="icon danger" onclick='ModView.close()'>&times;</label><label id="refreshModView" class="icon danger" onclick='ModView.refresh()'>&#x21bb;</label>`;
        this.modViewDiv.appendChild(this.modViewDivContent);
        document.body.appendChild(this.modViewDiv);

        // Notification Badge
        this.modViewBadge = document.createElement("div");
        this.modViewBadge.id = "modViewBadge";
        this.modViewBadge.classList.add("empty"); // Start as gray when count is 0
        this.modViewBadge.innerHTML = `<span id="modViewBadgeIcon">0</span><div id="modViewBadgeText"></div>`; // Reports
        this.modViewBadge.style.display = "none"; // Hide initially

        document.body.appendChild(this.modViewBadge);
        this.didInit = true; // important flag, else will hang
    }

    static open() {
        this.modViewDiv.classList.add("show");
    }

    static close() {
        this.modViewDiv.classList.remove("show");
        let badgeCount = parseInt(this.modViewBadge.querySelector("#modViewBadgeIcon").innerText) || 0;

        // Only hide if count is 0
        if (badgeCount === 0) {
            this.modViewBadge.style.display = "none";
        }
        else {
            this.modViewBadge.style.display = "flex";
        }
    }

    static showReports(reports) {
        let messageReports = reports.filter(r => r.reportType === "message");
        let userReports = reports.filter(r => r.reportType === "user");
        let dmReports = reports.filter(r => r.reportType === "dm_message");
        this.reports = reports

        let html = `
            <div class="modview_tabs">
                <div class="modview_tab active" onclick="ModView.switchTab('messageReports')">Message Reports <span class="modview_tabnumber active">${messageReports.length || 0}</span></div>
                <div class="modview_tab" onclick="ModView.switchTab('dmReports')">DM Reports <span class="modview_tabnumber active">${dmReports.length || 0}</span></div>
                <!--<div class="modview_tab" onclick="ModView.switchTab('userReports')">User Reports <span class="modview_tabnumber">${userReports.length || 0}</span></div>-->
            </div>
    
            <div id="messageReports" class="modview_tab-content active">
                ${this.generateTable(messageReports)}
            </div>
             <div id="dmReports" class="modview_tab-content">
                ${this.generateTable(dmReports)}
            </div>
            <div id="userReports" class="modview_tab-content">
                ${this.generateTable(userReports)}
            </div>
        `;

        // Ensure the close button stays at the top
        this.modViewDivContent.innerHTML = `
            <label id="closeModView" class="icon danger" onclick="ModView.close()">&times;</label>
            <label id="refreshModView" class="icon danger" onclick='ModView.refresh()'>&#x21bb;</label>
            ${html}
        `;

        this.updateBadge(reports.length)
    }


    static addNotification(onClickCallback) {
        let badgeCount = parseInt(this.modViewBadge.querySelector("#modViewBadgeIcon").innerText) || 0;
        badgeCount++; // Increase count
        this.modViewBadge.querySelector("#modViewBadgeIcon").innerText = badgeCount;

        // Change color based on count
        if (badgeCount > 0) {
            this.modViewBadge.classList.remove("empty"); // Red when count > 0
        }

        this.modViewBadge.style.display = "flex"; // Show badge

        this.modViewBadge.onclick = () => {
            this.modViewBadge.style.display = "none";
            if (!this.modViewDiv.classList.contains("show")) {
                this.open(); // Open modViewDiv
            }
            if (onClickCallback) onClickCallback(); // Execute provided function
        };
    }


    static generateTable(reports) {
        let table = `
            <table class="modview_">
                <tr class="modview_">
                    <th class="modview_">ID</th>
                    <th class="modview_">Creator</th>
                    <th class="modview_">Reported User</th>
                    <th class="modview_">Status</th>
                </tr>
        `;

        reports.forEach(report => {
            let reportCreator = ModView.parseJson(report.reportCreator);
            let reportedUser = ModView.parseJson(report.reportedUser);

            table += `
                <tr class="modview_" onclick="ModView.showReportDetails(${report.id})">
                    <td class="modview_">${report.id}</td>
                    <td class="modview_">${reportCreator ? reportCreator.name : "Unknown"}</td>
                    <td class="modview_">${reportedUser ? reportedUser.name : "Unknown"}</td>
                    <td class="modview_">${report.reportStatus}</td>
                </tr>
            `;

            ModView.addNotification(null);

        });

        table += `</table>`;
        return table;
    }

    static switchTab(tabId) {
        document.querySelectorAll('.modview_tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.modview_tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.modview_tabnumber').forEach(el => {
            try {
                el.classList.remove('active')
            }
            catch {

            }
        });

        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.modview_tab[onclick="ModView.switchTab('${tabId}')"]`).classList.add('active');

        document.querySelector(`.modview_tab[onclick="ModView.switchTab('${tabId}')"] span`).classList.add('active');
    }

    static updateBadge(count) {
        this.modViewBadge.querySelector("#modViewBadgeIcon").innerText = count;
        this.modViewBadge.style.display = count > 0 ? "flex" : "none";
    }

    static async showReportDetails(reportId) {
        let report = this.reports.find(r => r.id === reportId);
        if (!report) {
            console.warn("Report not found");
            return;
        }

        let reportCreator = this.parseJson(report.reportCreator);
        let reportedUser = this.parseJson(report.reportedUser);
        let reportData = report.reportData
        reportData.author = await ChatManager.resolveMember(reportData?.author?.id);
        if(!reportData?.author?.name){
            console.error("Unable to resolve reported message member")
        }

        console.log(reportData)

        let reportMessage = "";
        if(report.reportType === "dm_message") {
            // if is string parse it
            if(typeof reportData.message === "string") reportData.message = JSON.parse(reportData.message);
            reportMessage = reportData.message.content
        }
        else{
            if(reportData.message.substring(0, 4).includes(("{"))){
                reportMessage = reportData.message = (JSON.parse(reportData.message)).content;
            }
            else{
                reportMessage = reportData.message;
            }
        }
        let messageHistory = await UserReports.showMessageLogs(reportData.messageId)

        let reportedMessageConvertionResult = await convertMention(reportMessage, true);
        reportMessage = reportedMessageConvertionResult.text;
        reportMessage = await text2Emoji(reportMessage)

        this.modViewDivContent.innerHTML = `
        <label id="closeModView" class="icon danger" onclick="ModView.close()">&times;</label>
        <label id="refreshModView" class="icon danger" onclick='ModView.refresh()'>&#x21bb;</label>
        <h2>Report Details</h2>

        <div class="user-container">
            <div class="user-section reporter">
                <img src="${reportCreator.icon || '/img/default_pfp.png'}" class="user-icon" onclick='getMemberProfile("${reportCreator.id}", null, null, event)'>
                <div>
                    <h3>Reporter</h3>
                    <p><strong>Name:</strong> ${reportCreator.name} (${reportCreator.id})</p>
                    <!--<p><strong>Status:</strong> 
                        <select class="status-select">
                            <option value="active" ${reportCreator.isMuted === 0 && reportCreator.isBanned === 0 ? "selected" : ""}>Normal</option>
                            <option value="muted" ${reportCreator.isMuted === 1 ? "selected" : ""}>Muted</option>
                            <option value="banned" ${reportCreator.isBanned === 1 ? "selected" : ""}>Banned</option>
                        </select>
                    </p>-->
                    <div class="action-buttons">
                        <button class="mute-btn" onclick="ModView.handleMute('${reportCreator.id}')">Mute</button>
                        <button class="kick-btn" onclick="ModView.handleKick('${reportCreator.id}')">Kick</button>
                        <button class="ban-btn"onclick="ModView.handleBan('${reportCreator.id}')">Ban</button>
                    </div>
                </div>
            </div>

            <div class="user-section reported">
                <img src="${reportedUser.icon || '/img/default_pfp.png'}" class="user-icon" onclick='getMemberProfile("${reportedUser.id}", null, null, event)'>
                <div>
                    <h3>Reported</h3>
                    <p><strong>Name:</strong> ${reportedUser.name} (${reportedUser.id})</p>
                    <!--<p><strong>Status:</strong> 
                        <select class="status-select">
                            <option value="active" ${reportedUser.isMuted === 0 && reportCreator.isBanned === 0 ? "selected" : ""}>Normal</option>
                            <option value="muted" ${reportedUser.isMuted === 1 ? "selected" : ""}>Muted</option>
                            <option value="banned" ${reportedUser.isBanned === 1 ? "selected" : ""}>Banned</option>
                        </select>
                    </p>-->
                    <div class="action-buttons">
                        <button class="mute-btn" onclick="ModView.handleMute('${reportedUser.id}')">Mute</button>
                        <button class="kick-btn" onclick="ModView.handleKick('${reportedUser.id}')">Kick</button>
                        <button class="ban-btn" onclick="ModView.handleBan('${reportedUser.id}')">Ban</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="report-info">
            <h3>Report Information</h3>
            <p><strong>Type:</strong> ${report.reportType}</p>
            <!--<p><strong>Status:</strong>
                <select class="status-select">
                    <option value="pending" ${report.reportStatus === "pending" ? "selected" : ""}>Pending</option>
                    <option value="under-review" ${report.reportStatus === "under-review" ? "selected" : ""}>In Review</option>
                    <option value="closed" ${report.reportStatus === "closed" ? "selected" : ""}>Closed</option>
                </select>
            </p>-->

            <p><strong>User Note:</strong></p>
            <div class="modview_message-box">
                ${report.reportNotes}
            </div>
        </div>

        ${reportData ? `
        <div class="modview_message-container">
            <h3>Reported Message</h3>
            <div class="modview_message-box">
                <p><strong>User:</strong> ${reportData?.author?.name} (${reportData?.author?.id})</p>
                <p><strong>Message:</strong></p> <div class="reported-message"><span>${reportMessage}</span></div>
                <p><strong>Time:</strong> ${new Date(reportData.timestamp).toLocaleString()}</p>
            </div>

            ${messageHistory.length > 0 ?
                    `<div class="modview_message-box" style="margin-top: 20px;">
                        <details>
                            <summary>Message Edit History</summary>
                    
                            <div class="history-container" style="margin-top: 10px;">
                            ${messageHistory // some crazy bullshittery
                        .map(msg => {

                            let clean = msg.message.replace(/^<p>([\s\S]*)<\/p>$/i, "$1");

                            // check if the reported message isnt there anymore but logged
                            let messageColorhint = "";
                            if (reportData.message == msg.message) {
                                messageColorhint = "background:rgba(236, 105, 105, 0.6);"
                            }
                            else {
                                messageColorhint = "background:rgba(96,102,109,1);";
                            }

                            return `<div class="history-item" style="margin-top: 20px; background-color: #4F555C !important;padding: 10px; width: calc(100% - 20px);">
                                        <span class="history-title" style="font-style: italic;">${msg.name} (${msg.id}) @</span>
                                        <span class="history-time" style="font-style: italic;">${new Date(msg.editedTimestamp).toLocaleString()}:</span>

                                        <div class="history-msg" style="margin: 10px 0 0px 0; padding:10px; width:calc(100% - 20px);${messageColorhint}">
                                            ${clean}
                                        </div>
                                    </div>`;
                        })
                        .join("")}
                            </div>


                        </details>
                    </div>`
                    : ""}
        </div>
        ` : ''}

        <div class="modview_action-buttons action-buttons" >
            <button class="delete-btn" onclick="ModView.deleteReport('${report.id}')">Delete Report</button>
            <button class="kick-btn" onclick="ModView.deleteMessage('${reportData.messageId}', '${reportCreator.id}', '${reportedUser.id}')">Delete Reported Message</button>
        </div>

        <button class="back-button" onclick="ModView.showReports(ModView.reports)">Back</button>
    `;
    }

    static refresh() {
        UserReports.getReports();
    }

    static handleMute(id) {
        ModView.close();
        ModActions.muteUser(id, () => {
            ModView.open();
        })
    }

    static handleKick(id) {
        ModView.close();
        ModActions.kickUser(id, () => {
            ModView.open();
        })
    }

    static handleBan(id) {
        ModView.close();
        ModActions.banUser(id, () => {
            ModView.open();
        })
    }

    static deleteMessage(messageId, reporterId, reportedId) {
        ModView.close();

        customPrompts.showConfirm(
            "Do you want to delete this report??",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {
                    socket.emit("deleteMessageInReport", {
                        id: UserManager.getID(),
                        token: UserManager.getToken(),
                        messageId: messageId,
                        reporterId: reporterId,
                        reportedId: reportedId,
                    }, function (response) {
                        showSystemMessage({
                            title: response.msg,
                            text: "",
                            icon: response.type,
                            img: null,
                            type: response.type,
                            duration: 4000
                        });
                    });
                }
            },
            () => {
                ModView.open();
            }
        )
    }

    static deleteReport(reportId) {
        ModView.close();

        customPrompts.showConfirm(
            "Do you want to delete this report??",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {
                    socket.emit("deleteReport", {
                        id: UserManager.getID(),
                        token: UserManager.getToken(),
                        reportId: reportId,
                    }, function (response) {
                        showSystemMessage({
                            title: response.msg,
                            text: "",
                            icon: response.type,
                            img: null,
                            type: response.type,
                            duration: 4000
                        });

                        ModView.refresh();
                    });

                }
            },
            () => {
                ModView.open();
            }
        )
    }


    static parseJson(jsonString) {
        try {
            return JSON.parse(JSON.stringify(jsonString));
        } catch (error) {
            console.error("Invalid JSON:", jsonString);
            return null;
        }
    }
}