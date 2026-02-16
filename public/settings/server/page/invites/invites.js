


document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "invites") return;

    initInvites();
});

function initInvites(){
    getInviteCodes()
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageInvites" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });
}

function deleteInvite(code){
    if(!code){
        console.warn("couldnt delete invite because it wasnt supplied")
        return;
    }

    customPrompts.showConfirm(
        "Do you want to delete this invite code?",
        [["Yes", "success"], ["No", "error"]],
        (selectedOption) => {

            if (selectedOption === "yes") {
                socket.emit("deleteInvite", {id: UserManager.getID(), token: UserManager.getToken(), code }, function (response) {
                    console.log(response);
                    getInviteCodes();
                });
            }
        }
    )
}

function getInviteCodes(){
    socket.emit("getInvites", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
        try{
            let accessCodesTable = document.getElementById("inviteCodes");

            if(accessCodesTable && Object.keys(response?.invites).length > 0) {
                accessCodesTable.innerHTML = `<thead>
                                            <tr>
                                                <td>Code</td>
                                                <td>Valid until</td>
                                                <td>max uses</td>
                                                <td>Created by</td>
                                                <td>Actions</td>
                                            </tr>
                                        </thead> `;

                for(let key of Object.keys(response.invites)) {
                    let code = response.invites[key];

                    accessCodesTable.innerHTML += `
                 <tr>
                    <td>${key}</td>
                    <td>${code?.expires === -1 ? "forever" : new Date(code.expires).toLocaleString("narrow")}</td>
                    <td>${code.maxUses === -1 ? "infinite" : code.maxUses}</td>
                    <td>
                        ${code.createdBy?.name ?
                        `<div style="display: flex; flex-direction: row; justify-content: center; gap: 4px;margin-bottom: 10px;">
                                <img draggable="false" class="icon" src="${code.createdBy?.icon || '/img/default_icon.png'}" />
                                <p style="margin: auto;">
                                    ${code.createdBy?.name}
                                </p>
                            </div>`
                        :
                        code.createdBy}
                    </td>
                    <td>
                        <a onclick="deleteInvite('${key}')">Delete</a>
                    </td>
                </tr>`
                }
            }

            console.log(response);
        }
        catch(err){
            console.log("Unable to get Server Information");
            console.log(err);
        }

    });
}

function createAccessCode(){
    let code = UserManager.generateId(8, true);
    customPrompts.showPrompt(
        `Create an Invite Code`,
        `
                     <div style="display: flex; flex-direction: row; gap: 60px;">
                        <div style="display: flex; flex-direction: column;">
                             <div class="prompt-form-group">
                                 <label class="prompt-label" for="validUntil">When should the code expire?</label>
                                 <input class="prompt-input" type="datetime-local" name="validUntil" style="width: 100%;">
                             </div>
                         
                             <div class="prompt-form-group">
                                 <label for="neverExpire">Never expire?</label>
                                 <input class="prompt-input" type="checkbox" name="neverExpire" id="neverExpire">
                             </div>
                        </div>
                         
                         <div style="display: flex; flex-direction: column;">
                             <div class="prompt-form-group">
                                <label class="prompt-label" for="maxUses">How many people can use the code?</label>
                                <input class="prompt-input" autocomplete="off" type="number" name="maxUses" id="maxUses" placeholder="Enter an invite code" value="">
                             </div>
                             
                             <div class="prompt-form-group">
                                 <label for="infiniteCodeUses">Infinite code uses?</label>
                                 <input class="prompt-input" type="checkbox" id="infiniteCodeUses" name="infiniteCodeUses">
                             </div>
                         </div>
                     </div>
                     
                     <div style="display: flex; flex-direction: column; margin-top: 20px;">
                         <div class="prompt-form-group">
                             <label class="prompt-label" for="customCode">Custom Code (optional)</label>
                             <input class="prompt-input" type="text" name="customCode" style="width: 100%;" value="${code}">
                         </div>                             
                    </div>
                     
                            `,
        async function (values) {
            console.log(values);

            let customCode = values.customCode;
            let infiniteUses = values.infiniteCodeUses;
            let neverExpires = values.neverExpire;
            let maxUses = Number(values.maxUses);
            let validUntil = new Date(values.validUntil).getTime();

            // if no date was selected
            if(isNaN(validUntil)){
                validUntil = -1
                neverExpires = true;
            }

            // make a new code if its not set for some reason
            if(!customCode){
                customCode = UserManager.generateId(8, true)
            }

            // toggles aka checkboxes
            if(!maxUses || infiniteUses === true) maxUses = -1;
            if(neverExpires === true) validUntil = -1;

            // submit it
            socket.emit("createInvite", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                code: customCode,
                maxUses,
                expires: validUntil
            }, function (response) {
                if(response.error){
                    console.log(response);
                }
                else{
                    getInviteCodes()
                }
            })
        }
    )
}
