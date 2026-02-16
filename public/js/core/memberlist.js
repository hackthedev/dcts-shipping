
function getMemberList() {
    // hehe
    let infolist = document.getElementById("infolist");
    if(localStorage.getItem("memberlist_html_cache") && infolist?.innerText?.trim()?.length  === 0) infolist.innerHTML = localStorage.getItem("memberlist_html_cache");

    if(!UserManager.getChannel()) return;

    Clock.start("memberlist_request")
    socket.emit("getMemberList", {
        id: UserManager.getID(),
        username: UserManager.getUsername(),
        icon: UserManager.getPFP(),
        token: UserManager.getToken(),
        channel: UserManager.getChannel(),
        group: UserManager.getGroup()
    }, async function (response) {
        Clock.stop("memberlist_request")
        Clock.start("memberlist_build")

        if (response?.error) {
            showSystemMessage({
                title: response.error || "", text: "", icon: response.type, img: null, type: response.type, duration: 1000
            });
        } else {
            let members = response?.members;
            let memberRole = await ChatManager.resolveRole("1")
            let offlineRole = await ChatManager.resolveRole("0")

            let rolesMap = {};

            // get all the roles based on the members
            for (let memberId in members) {
                let member = members[memberId];

                let roleId = member.isOffline === true ? 1 : member.highestRole.info.id;
                let role;

                // lety try to "cache" this shit a bit
                if (roleId === 0) {
                    role = offlineRole;
                } else if (roleId === 1) {
                    role = memberRole;
                }
                else{
                    if(rolesMap[roleId]){
                        role = rolesMap[roleId].role;
                    }
                    else{
                        role = await ChatManager.resolveRole(roleId);
                    }
                }

                if (!role.info.displaySeperate) continue;

                if (!rolesMap[roleId]) {
                    rolesMap[roleId] = {
                        role,
                        members: []
                    };
                }

                rolesMap[roleId].members.push(member);
            }

            // sort roles based on sortId
            const sortedRoles = Object.values(rolesMap)
                .sort((a, b) => b.role.info.sortId - a.role.info.sortId);

            for (let entry of sortedRoles) {
                insertRoleIntoList(entry.role.info, getRoleHTML(entry.role));

                const sortedMembers = entry.members
                    .slice()
                    .sort((a, b) =>
                        String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" })
                    );

                for (let member of sortedMembers) {
                    insertMemberIntoRole(
                        member,
                        entry.role.info.id,
                        getMemberHTML(member, entry.role)
                    );
                }
            }


            reorderList(members);
            cleanupEmptyRoles();
        }

        Clock.stop("memberlist_build")

        // im a sneaky bastard >:)
        localStorage.setItem("memberlist_html_cache", document.getElementById("infolist").innerHTML);
    });

    function reorderList(members){
        let elements = getRenderElements();

        elements.forEach(element => {
            const frag = document.createDocumentFragment();

            let roles = Array.from(element.querySelectorAll(".infolist-role"))
                .sort((a, b) =>
                    Number(b.getAttribute("data-sort-id")) -
                    Number(a.getAttribute("data-sort-id"))
                );

            roles.forEach(role => frag.appendChild(role));
            element.appendChild(frag);

            element.querySelectorAll(".memberlist-container").forEach(member => {
                let memberId = member.getAttribute("data-member-id");
                if(!members[memberId]){
                    member.remove();
                }
            });
        });
    }

    function cleanupEmptyRoles(){
        getRenderElements().forEach(element => {
            element.querySelectorAll(".infolist-role").forEach(role => {
                if(role.querySelectorAll(".memberlist-container").length === 0){
                    role.remove();
                }
            });
        });
    }


    function removeMemberFromOtherRoles(memberId, roleId){
        let elements = getRenderElements();

        elements.forEach(element => {
            let entries = getMemberEntriesById(element, memberId);
            if(!entries.length) return;

            entries.forEach(entry => {
                let roleContainer = entry.closest(".infolist-role");
                let roleContainerId = roleContainer?.getAttribute("data-role-id");

                if(Number(roleContainerId) !== Number(roleId)){
                    entry.remove();
                }
            });
        });
    }



    function getMemberEntriesFromRoleId(element, roleId){
        return element.querySelectorAll(`.infolist-role[data-role-id="${roleId}"] .memberlist-container`);
    }

    function getMemberEntriesById(element, memberId){
        return element.querySelectorAll(`.memberlist-container[data-member-id="${memberId}"]`);
    }

    function getRenderElements(){
        return [
            document.getElementById("infolist"),
            document.getElementById("mobile_memberlist")
        ];
    }

    function insertRoleIntoList(roleInfo, roleHTML){
        let elements = getRenderElements();

        elements.forEach(element => {
            let roleHeaderElement = element.querySelectorAll(`.infolist-role[data-role-id="${roleInfo.id}"]`);

            if(roleHeaderElement?.length === 0){
                element.insertAdjacentHTML("beforeend", roleHTML);
            }
        });
    }

    function insertMemberIntoRole(memberObject, roleId, memberHTML){
        let elements = getRenderElements();

        removeMemberFromOtherRoles(memberObject.id, roleId);
        if(memberObject.status === "null") memberObject.status = null;

        elements.forEach(element => {
            let roleHeaderElement = element.querySelector(`.infolist-role[data-role-id="${roleId}"]`);
            if(!roleHeaderElement) return;

            let alreadyExistsInRole = roleHeaderElement.querySelector(
                `.memberlist-container[data-member-id="${memberObject.id}"]`
            );

            if(!alreadyExistsInRole){
                roleHeaderElement.insertAdjacentHTML("beforeend", memberHTML);
            }
            else{
                let memberIcon   = alreadyExistsInRole.querySelector(".memberlist-img");
                let memberName   = alreadyExistsInRole.querySelector(".memberlist-member-info.name span");
                let memberStatus = alreadyExistsInRole.querySelector(".memberlist-member-info.status span");

                if(memberIcon){
                    memberIcon.classList.toggle("offline_pfp", !!memberObject.isOffline);

                    let newSrc = ChatManager.proxyUrl(memberObject.icon);
                    if(memberIcon.src !== newSrc){
                        memberIcon.src = newSrc;
                    }
                }

                if(memberName && memberName.innerText !== memberObject.name){
                    memberName.innerText = memberObject.name;
                }
                if(memberStatus && memberStatus.innerText !== memberObject.status){
                    memberStatus.innerText = memberObject.status;
                }
            }
        });
    }


    function getRoleHTML(role){
        return `<div class="infolist-role" data-sort-id="${role.info.sortId}" data-role-id="${role.info.id}" title="${role.info.name}" style="color: ${role.info.color};">
                    ${role.info.name}
                    <hr style="margin-bottom: 16px;border: 1px solid ${role.info.color};">
                </div>`
    }

    function getMemberHTML(member, role){
        return `<div class="memberlist-container" data-member-id="${member.id}">
                        <img draggable="false" class="memberlist-img ${member?.isOffline ? "offline_pfp" : ""}" data-member-id="${member.id}" src="${ChatManager.proxyUrl(member.icon)}" onerror="this.src = '/img/default_pfp.png'">
                        
                        <div style="display:flex;flex-direction: column;width: calc(100% - 35px);">
                            <div class="memberlist-member-info name" 
                                onclick="getMemberProfile('${member.id}');" data-member-id="${member.id}"" 
                                style="color: ${role.info.color};">
                                ${getDisplayString(member?.name, member, role.info.color)}
                            </div>
                            <div class="memberlist-member-info status" data-member-id="${member.id}" style="color: ${role.info.color};">
                                ${getDisplayString(member?.status, member, role.info.color)}
                            </div>
                        </div>
                </div>`
    }

    function getDisplayString(text, member, colorOverride = null){
        if(!text?.trim()) return "<span></span>";

        let displayColor = "white";
        if (member.isMuted) colorOverride = "grey";
        if (member.isBanned) colorOverride = "indianred";

        let isBannedOrMuted = member?.isMuted || member?.isBanned;
        return `${isBannedOrMuted ? `<s style="color: ${colorOverride ? colorOverride : displayColor};">` : ""}<span style="font-style:${member.isMuted ? "italic" : "normal"};color:${colorOverride ? colorOverride : displayColor}" data-member-id="${member.id}">${text}</span>${isBannedOrMuted ? `</s>` : ""}`;
    }
}