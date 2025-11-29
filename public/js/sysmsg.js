(function() {
    const style = `
        #prompt-container {
            color: white;
            padding: 12px 18px;
            border-radius: 4px;
            max-width: 400px;
            max-height: 18vh; /* 15% of viewport height */
            position: fixed;
            z-index: 99999;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            opacity: 0;
            animation: fadein 0.5s forwards;
            user-select: none;
            overflow: hidden;

            border: 3px solid rgba(255, 255, 255, 0.2); /* Neutral soft white border */
        }

        #prompt-container a{
            text-decoration: underline;
            font-style: italic;
        }

        #prompt-container a:hover{
            cursor: pointer;
        }

        /* Gradient overlay for the bottom fade-out effect */
        #prompt-container::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 20px;
            background: linear-gradient(to top, var(--container-bg-color, green) 20%, transparent);
            pointer-events: none;
            border-radius: 0 0 4px 4px; /* Match the container’s border-radius */
        }

        #prompt-content-container img {
            background-size: cover;
            object-fit: cover;
            background-position: center center;
        }

        #prompt-content-container {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        #prompt-img-container {
            width: 35px;
        }

        #prompt-icon {
            width: 35px;
            height: 35px;
            margin-right: 6px !important;
            border-radius: 50%;

            background-size: cover;
            object-fit: cover;
            background-position: center center;
        }

        #prompt-title {
            font-weight: bold;
            margin: 0;
            margin-top: 6px;
        }

        #prompt-text {
            display: flex;
            flex-wrap: wrap;
            margin: 0;
            word-break: break-word;
        }
        
        #prompt-text p {
            margin: 6px 0;
        }

        #prompt-banner {
            max-height: 100px;
            width: 100%;
            object-fit: cover;
            border-radius: 4px;
            margin-top: 10px;
        }

        @keyframes fadein {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fadeout {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = style;
    document.head.appendChild(styleSheet);

    let isMessageVisible = false;
    let currentTimeout;

    function getTypeColor(type) {
        switch(type) {
            case 'success': return 'green';
            case 'warning': return 'orange';
            case 'error': return 'indianred';
            default: return '#36393F';
        }
    }

    function applyGradientColor(promptContainer) {
        const bgColor = window.getComputedStyle(promptContainer).backgroundColor;
        promptContainer.style.setProperty('--container-bg-color', bgColor);
    }

    function getImageSrcFromHTML(htmlString, removeResult = null) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const img = doc.querySelector('img');
    
        if (!img) return null;
    
        const imgSrc = img.src;
    
        if (removeResult) {
            img.remove();
            return doc.body.innerHTML.trim();
        }
    
        return imgSrc;
    }

    function displayMessage({ title, text, icon, img, type, duration, onClick }) {
        if (isMessageVisible) {
            clearTimeout(currentTimeout);
            closeSystemMessage(true);
        }

        isMessageVisible = true;

        const promptContainer = document.createElement("div");
        promptContainer.id = "prompt-container";
        const typeColor = getTypeColor(type);
        promptContainer.style.backgroundColor = typeColor;

        let iconPath = `/img/${icon}.png`;
        if(icon.includes("data:image")) iconPath = icon;
        if(icon.includes("/uploads/")) iconPath = icon; // Upload filepath
        if(iconPath.includes("/img//img/")) iconPath = iconPath.replace("/img//img/", "/img/").replace(".png.png", ".png");

        if(getImageSrcFromHTML(text) != null){
            img = getImageSrcFromHTML(text);
            if(img) text = getImageSrcFromHTML(text, true);
        }

        promptContainer.innerHTML = `
            <div id="prompt-content-container">
                ${icon ? `<img id="prompt-icon" src="${iconPath}" alt="icon">` : ""}
                <div>
                    <h3 id="prompt-title">${title}</h3>
                    <div id="prompt-text">${text}</div>
                </div>
            </div>
            ${img ? `<img id="prompt-banner" src="${img}" alt="banner">` : ""}
        `;

        if (typeof onClick === 'function') {
            promptContainer.addEventListener("click", () => onClick());
            promptContainer.style.cursor = "pointer";
        }

        document.body.appendChild(promptContainer);

        // Apply gradient background color for the fade-out effect
        applyGradientColor(promptContainer);

        currentTimeout = setTimeout(() => {
            promptContainer.style.animation = "fadeout 0.5s forwards";
            setTimeout(() => {
                promptContainer.remove();
                isMessageVisible = false;
            }, 500);
        }, duration);
    }

    window.showSystemMessage = function({ title, text, icon = '', img = '', type = 'neutral', duration = 3000, onClick = null }) {
        displayMessage({ title, text, icon, img, type, duration, onClick });
    };

    window.closeSystemMessage = function(force = false) {
        const promptContainer = document.getElementById("prompt-container");
        if (!promptContainer) return;

        clearTimeout(currentTimeout);

        if (force) {
            promptContainer.remove();
            isMessageVisible = false;
            return;
        }

        promptContainer.style.animation = "fadeout 0.5s forwards";
        setTimeout(() => {
            promptContainer.remove();
            isMessageVisible = false;
        }, 500);
    };


})();
