class ModView {

    static modViewDiv;
    static modViewDivContent;

    static addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #modViewDiv {
    
                width: 60% !important;
                height: 80% !important;

                position: fixed; /* or absolute */
                top: 10%; /* Adjust as needed */
                left: 100%; /* Start off-screen */
                transform: translateX(0);
                z-index: 9999;
                background: #34383C; /* Example styling */
                color: white;
                padding: 20px;
                transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
                opacity: 0; /* Start fully invisible */

                border-top-left-radius: 8px;
                border-bottom-left-radius: 8px;
                box-shadow: 10px 10px 13px 0px rgba(0,0,0,0.75);
                
                border-top: 2px solid var(--primary-bright);
                border-left: 2px solid var(--primary-bright);

                overflow-y: auto;
                overflow-x: hidden;
            }

            #modViewDiv.show {
                transform: translateX(-100%);
                opacity: 1;
            }

            #closeModView{
                float: right;
                background-color: indianred;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                text-align: center;
                cursor: pointer;
            }


            #modViewDiv .icon.danger {
                background-color: var(--error) !important;
            }


            /* popup badges*/
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
                gap: 5px;
            }

            /* Hover effect */
            #modViewBadge:hover {
                transform: scale(1.05);
            }

            /* Number (Aligned to Top) */
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

            /* Reports Text (Properly Rotated & Centered) */
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
        this.addStyles();

        this.modViewDiv = document.createElement("div");
        this.modViewDiv.id = "modViewDiv";

        this.modViewDivContent = document.createElement("div");
        this.modViewDivContent.id = "modViewDivContent";
        this.modViewDivContent.innerHTML = `<label id="closeModView" class="icon danger" onclick='ModView.close()'>&times;</label>`;
        this.modViewDiv.appendChild(this.modViewDivContent);
        document.body.appendChild(this.modViewDiv);

        // Notification Badge
        this.modViewBadge = document.createElement("div");
        this.modViewBadge.id = "modViewBadge";
        this.modViewBadge.classList.add("empty"); // Start as gray when count is 0
        this.modViewBadge.innerHTML = `<span id="modViewBadgeIcon">0</span><div id="modViewBadgeText"></div>`; // Reports
        this.modViewBadge.style.display = "none"; // Hide initially

        document.body.appendChild(this.modViewBadge);

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
    }
    
}