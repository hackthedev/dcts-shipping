class ChannelTree {
    static sortableInstances = {};
    static lastUpdateTime = 0; // Used to prevent duplicate updates

    static getTree() {
        socket.emit("getChannelTree", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            username: UserManager.getUsername(),
            icon: UserManager.getPFP(),
            group: UserManager.getGroup()
        }, function (response) {    
            let group = UserManager.getGroup();

            const catCollection = response.data.groups[group].categories;
            let sortedCats = Object.keys(catCollection).sort((a, b) => {
                return catCollection[b].info.sortId - catCollection[a].info.sortId;
            });

            const channeltree = document.getElementById("channeltree");
            if (!channeltree) return console.error("channeltree element not found!");

            ChannelTree.destroySortable();

            let tempContainer = document.createElement("div");
            tempContainer.insertAdjacentHTML("beforeend", `<h2>${response.data.groups[group].info.name}</h2><hr>`);

            sortedCats.forEach(cat => {
                let category = catCollection[cat];

                let categoryHTML = `
                    <details class="category" open>
                        <summary class="categoryTrigger" id="category-${category.info.id}" style="color: #ABB8BE; cursor: pointer;user-select: none;">
                            ${category.info.name}
                        </summary>
                        <ul class="sortable-channels" id="category-list-${category.info.id}" data-category-id="${category.info.id}">
                        </ul>
                    </details>
                `;
                tempContainer.insertAdjacentHTML("beforeend", categoryHTML);

                let categoryElement = tempContainer.querySelector(`#category-list-${category.info.id}`);

                const chanCollection = category.channel;

                // only display if category has channels
                if(chanCollection){
                    let sortedChans = Object.keys(chanCollection).sort((a, b) => {
                        return chanCollection[b].sortId - chanCollection[a].sortId;
                    });
    
                    sortedChans.forEach(chan => {
                        let channel = chanCollection[chan];

                        let hasNewMessages = false;

                        let savedCount = parseInt(CookieManager.getCookie(`message-marker_${channel.id}`)) || 0;

                        // dont mark voice channels. there is no point in it
                        if(channel.msgCount != savedCount && channel.type != "voice"){
                            hasNewMessages = true;
                            // we only wanna set it once we actually read the message in the channel or clicked the channel.
                            // so we mark the messages as read when we request the chat messages
                            // CookieManager.setCookie(`message-marker_${chan.id}`, chan.msgCount);
                        }
    
                        let channelHTML = `
                            <li draggable="true" channelType="${channel.type}" id="channel-${channel.id}" style="color: #ABB8BE; cursor: pointer;user-select: none;" data-channel-id="${channel.id}">
                                <a channelType="${channel.type}" class="channelTrigger msgCount_${channel.msgCount} ${hasNewMessages ? `markChannelMessage` : ""}" id="channel-${channel.id}" onclick="setUrl('?group=${group}&category=${category.info.id}&channel=${channel.id}'${channel.type == "voice" ? `, true` : ""})" 
                                   style="display: block;">
                                    ${channel.type == "text" ? "⌨" : "🎙️"} ${channel.name}
                                </a>
                            </li>
                        `;
                        categoryElement.insertAdjacentHTML("beforeend", channelHTML);

                        if(!hasNewMessages) markChannel(channel.id, true)
                        if(hasNewMessages) markChannel(channel.id, false, channel.msgCoun)
                    });
                }                
            });

            channeltree.innerHTML = tempContainer.innerHTML;
            document.getElementById("mobile_channelList").innerHTML = channeltree.innerHTML;

            ChannelTree.makeSortable(channeltree, "categories", "summary");
            ChannelTree.makeAllChannelsSortable();
        });
    }

    static makeAllChannelsSortable() {
        document.querySelectorAll(".sortable-channels").forEach(categoryElement => {
            ChannelTree.makeSortable(categoryElement, "channels");
        });
    }

    static makeSortable(element, group, handle = null) {
        if (!ChannelTree.sortableInstances) {
            ChannelTree.sortableInstances = {};
        }

        if (ChannelTree.sortableInstances[element.id]) {
            ChannelTree.sortableInstances[element.id].destroy();
        }

        ChannelTree.sortableInstances[element.id] = new Sortable(element, {
            group: group,
            animation: 150,
            ghostClass: 'sortable-ghost',
            delay: 300,
            dragClass: "dragging", 
            chosenClass: "sortable-chosen",
            swapThreshold: 0.5, 
            handle: handle, 
            onEnd: function (evt) {
                const movedItem = evt.item;
                const newParent = evt.to;
                const oldParent = evt.from;

                if (group === "channels") {
                    movedItem.dataset.categoryId = newParent.dataset.categoryId;
                }

                ChannelTree.updateChannelTree()
            }
        });
    }

    static destroySortable() {
        if (!ChannelTree.sortableInstances) return;

        for (let key in ChannelTree.sortableInstances) {
            if (ChannelTree.sortableInstances[key]) {
                ChannelTree.sortableInstances[key].destroy();
                delete ChannelTree.sortableInstances[key];
            }
        }
    }

    static updateChannelTree() {
        console.log("Updating channel tree");
    
        let channelStructure = {};

        channelStructure = {}

        // ✅ Force DOM update before logging
        requestAnimationFrame(() => {
            let channeltree = document.getElementById("channeltree");
            let categories = channeltree.querySelectorAll(".categoryTrigger");
    
            let runner = categories.length-1;
            categories.forEach(category => {
                let channels = category.parentNode.querySelectorAll(".channelTrigger");                
                let categoryId = category.id.replace("category-", "");


                if (!channelStructure[categoryId]) {
                    channelStructure[categoryId] = { channels: [], info: { sortId: runner} };
                    runner -= 1;
                }             
    
                channels.forEach(channel => {
                    let channelId = channel.id.replace("channel-", "");                    
                    channelStructure[categoryId].channels.push(channelId)

                    console.log(`   - ${channel.textContent} (${channelId})`);
                });
            });

            socket.emit("updateChannelTreeSorting", { id: UserManager.getID(), token: UserManager.getToken(), group: UserManager.getGroup(), data: JSON.stringify(channelStructure) }, function (response) {

                console.log(response)
                /*
                showSystemMessage({
                    title: response.msg,
                    text: "",
                    icon: response.type,
                    img: null,
                    type: response.type,
                    duration: 1000
                });
                */
            });
        });
    }
    
}
