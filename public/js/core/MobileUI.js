class MobilePanel {

    static active = [];
    static leftMenu = null;
    static rightMenu = null;
    static swipeInitialized = false;
    static swipeLocked = false;

    static isMobile(){
        return window.matchMedia("(pointer: coarse)").matches;
    }

    static renderPanel(elements, side = "left"){
        MobilePanel.swipeLocked = true;

        const overlay = document.createElement("div");
        overlay.classList.add("mobile-ui");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.background = "rgba(0,0,0,0.4)";
        overlay.style.zIndex = "5";

        const panel = document.createElement("div");
        panel.classList.add("mobile-ui-panel");
        panel.style.position = "fixed";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.flexGrow = "1";
        panel.style.top = "0";
        panel.style.left = "0";
        panel.style.height = "100%";
        panel.style.width = "100%";
        panel.style.background = "black";
        panel.style.transition = "transform 0.25s ease";
        panel.style.zIndex = "6";
        panel.style.overflow = "auto";
        panel.style.minHeight = "0";

        if(side === "left"){
            panel.style.transform = "translateX(-100%)";
        }else{
            panel.style.transform = "translateX(100%)";
        }

        if(!Array.isArray(elements)) elements = [elements];

        const observers = [];

        const appendItem = (item, parent) => {
            if(item instanceof Element){
                const wrapper = document.createElement("div");
                wrapper.style.display = "contents";
                parent.appendChild(wrapper);

                const render = ()=>{
                    wrapper.replaceChildren(item.cloneNode(true));
                };

                render();

                const observer = new MutationObserver(render);
                observer.observe(item, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true
                });

                observers.push(observer);
                return;
            }

            if(item && typeof item === "object" && Array.isArray(item.children)){
                const group = document.createElement("div");
                group.style.display = "flex";
                group.style.flexDirection = item.direction || "column";
                group.style.width = item.width || "100%";
                group.style.height = item.height || "auto";
                group.style.flex = item.flex || "0 0 auto";
                group.style.flexGrow = item.flexGrow != null ? String(item.flexGrow) : "0";
                group.style.flexShrink = item.flexShrink != null ? String(item.flexShrink) : "1";
                group.style.flexBasis = item.flexBasis || "auto";
                group.style.overflow = item.overflow || "visible";
                group.style.minHeight = "0";
                group.style.minWidth = "0";
                parent.appendChild(group);

                item.children.forEach(child => appendItem(child, group));
            }
        };

        elements.forEach(item => appendItem(item, panel));

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        MobilePanel.active.push({panel, overlay, observers, side});

        requestAnimationFrame(()=>{
            panel.style.transform = "translateX(0)";
        });

        setTimeout(()=>{
            MobilePanel.swipeLocked = false;
        }, 300);

        let startX = 0;
        let currentX = 0;

        panel.addEventListener("touchstart",(e)=>{
            startX = e.touches[0].clientX;
            currentX = startX;
        });

        panel.addEventListener("touchmove",(e)=>{
            currentX = e.touches[0].clientX;
        });

        panel.addEventListener("touchend",()=>{
            const diff = currentX - startX;

            if(side === "left" && diff < -60){
                MobilePanel.close();
            }

            if(side === "right" && diff > 60){
                MobilePanel.close();
            }
        });
    }

    static close(){
        MobilePanel.swipeLocked = true;

        MobilePanel.active.forEach(({panel, overlay, observers, side})=>{
            if(side === "left"){
                panel.style.transform = "translateX(-100%)";
            }else{
                panel.style.transform = "translateX(100%)";
            }

            setTimeout(()=>{
                observers.forEach(o => o.disconnect());
                panel.remove();
                overlay.remove();
            },250);
        });

        MobilePanel.active = [];

        setTimeout(()=>{
            MobilePanel.swipeLocked = false;
        }, 350);
    }

    static setLeftMenu(elements){
        MobilePanel.leftMenu = elements;
        MobilePanel.initSwipe();
    }

    static setRightMenu(elements){
        MobilePanel.rightMenu = elements;
        MobilePanel.initSwipe();
    }

    static initSwipe(){
        if(MobilePanel.swipeInitialized) return;
        MobilePanel.swipeInitialized = true;

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;

        document.addEventListener("touchstart", (e)=>{
            if(MobilePanel.active.length) return;
            if(MobilePanel.swipeLocked) return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            currentY = startY;
        }, { passive: true });

        document.addEventListener("touchmove", (e)=>{
            if(MobilePanel.active.length) return;
            if(MobilePanel.swipeLocked) return;

            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;
        }, { passive: true });

        document.addEventListener("touchend", ()=>{
            if(MobilePanel.active.length) return;
            if(MobilePanel.swipeLocked) return;

            const diffX = currentX - startX;
            const diffY = currentY - startY;

            if(Math.abs(diffY) > Math.abs(diffX)) return;
            if(Math.abs(diffX) < 80) return;

            if(diffX > 0 && MobilePanel.leftMenu){
                MobilePanel.renderPanel(MobilePanel.leftMenu, "left");
                return;
            }

            if(diffX < 0 && MobilePanel.rightMenu){
                MobilePanel.renderPanel(MobilePanel.rightMenu, "right");
            }
        }, { passive: true });
    }

}