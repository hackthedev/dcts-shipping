console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

document.addEventListener("DOMContentLoaded", async () => {
    var page = getUrlParams("page");

    doInit(() => {

        socket.emit("checkPermission", {
            id: UserManager.getID(), token: UserManager.getToken(), permission: ["manageServer",
                "manageGroups",
                "manageChannels",
                "manageUploads",
                "viewLogs",
                "manageServerInfo",
                "manageRateSettings"], any: true
        }, function (response) {

            if (response.permission === "denied") {
                window.location.href = window.location.origin;
            }
            else {
                document.getElementById("pagebody").style.display = "block";
                loadPageContent(page ?? "server-info");
            }
        });

        var checkEmptyElements = document.querySelectorAll("#nav_settings div");
        checkEmptyElements.forEach(emptyElement => {

            var ele = emptyElement;
            if (ele == null || ele.id.length <= 0 || ele.id.includes("info")) { return; }


            var links = document.querySelectorAll("#nav_settings #" + ele.id + " a")
            if (links.length > 0) {
                links.forEach(link => {

                    if (link?.id?.length <= 0 || link == null) { return; }

                    // get permission needed from html
                    let permission = link?.getAttribute("data-permission");
                    console.log("Perm: ", permission)

                    socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission }, function (response) {

                        if (response.permission === "denied") {
                            //console.log(link.id)

                            // Get new line break
                            var br = document.getElementById(link.id + "-br");
                            if (br != null) { br.remove(); } // check if it exists. if so, remove it

                            // Save Parent Id for Empty Check
                            var parentId = link.parentNode.id;

                            //if(parentId == "info") { return; }

                            // Remove setting link
                            document.getElementById(link.id).remove();
                            //console.log(`Parent Id: ${parentId}`)
                            //console.log(`Child Id: ${link.id}`)

                            var parentLinksAfterDelete = document.querySelectorAll("#nav_settings #" + parentId + " a");

                            // Recheck if The "sections" of options is empty or not
                            var counter = 0;
                            parentLinksAfterDelete.forEach(secondLink => {
                                if (secondLink.id.length != 0) {
                                    counter++;
                                }
                            })

                            // If a section like "Media Settings" was empty, remove it
                            if (parentLinksAfterDelete.length == 0 || counter == 0) {
                                document.getElementById(parentId).remove();
                            }
                        }
                        else {

                        }
                    });
                });

            }
        });
    })
})
