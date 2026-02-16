document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "auditlog") return;

    initAuditLogs();
});

function initAuditLogs(){
    getLogs()

    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "viewAuditLog" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });
}

function getLogs(){
    socket.emit("getAuditlog", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
        try{
            // actually audit logs but lazy
            let auditLogTable = document.getElementById("auditlog");

            if(auditLogTable && Object.keys(response?.logs).length > 0) {
                auditLogTable.innerHTML = `<thead>
                                            <tr>
                                                <td>Content</td>
                                                <td>Date</td>
                                            </tr>
                                        </thead> `;

                for(let index of Object.keys(response.logs)) {

                    let log = response.logs[index];


                    auditLogTable.innerHTML += `
                     <tr>
                        <td>${log.text}</td>
                        <td>${new Date(log.datetime).toLocaleString("narrow")}</td>
                    </tr>`
                }
            }
            else if(Object.keys(response.logs).length === 0){
                auditLogTable.innerHTML += `
                        <tr>
                            <td>No data yet</td>
                            <td> </td>
                        <tr/>`
                return;
            }

            console.log(response);
        }
        catch(err){
            console.log("Unable to get Server Information");
            console.log(err);
        }

    });
}