class TooltipSystem {
    constructor() {
        this.addStyles();
        this.currentTooltip = null;
    }

    addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .tooltip-system-tooltip {
                position: absolute;
                background-color: #333;
                color: #fff;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                visibility: hidden;
                opacity: 0;
                transition: opacity 0.3s;
                max-width: 250px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }

            .tooltip-system-arrow {
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
            }

            .tooltip-system-arrow.top {
                bottom: 100%;
                left: 10px;
                border-width: 0 5px 5px 5px;
                border-color: transparent transparent #333 transparent;
            }

            .tooltip-system-arrow.bottom {
                top: 100%;
                left: 10px;
                border-width: 5px 5px 0 5px;
                border-color: #333 transparent transparent transparent;
            }

            .tooltip-system-arrow.left {
                right: 100%;
                top: 50%;
                transform: translateY(-50%);
                border-width: 5px 0 5px 5px;
                border-color: transparent transparent transparent #333;
            }

            .tooltip-system-arrow.right {
                left: 100%;
                top: 50%;
                transform: translateY(-50%);
                border-width: 5px 5px 5px 0;
                border-color: transparent #333 transparent transparent;
            }


            .tooltip-system-button {
                background-color: #5865F2;
                color: white;
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                align-self: flex-end;
                margin-top: 10px;
            }

            .tooltip-system-button:hover {
                background-color: #4752C4;
            }

            .tooltip-system-show-tooltip {
                visibility: visible;
                opacity: 1;
            }

            /* Smooth Rainbow Border Animation */
            @keyframes rainbow-border {
                0% { border-color: red; }
                10% { border-color: orange; }
                20% { border-color: yellow; }
                30% { border-color: lime; }
                40% { border-color: green; }
                50% { border-color: cyan; }
                60% { border-color: blue; }
                70% { border-color: indigo; }
                80% { border-color: violet; }
                90% { border-color: magenta; }
                100% { border-color: red; } /* Return smoothly to red */
            }

            .tooltip-system-rainbow-border {
                animation: rainbow-border 4s linear infinite;
                border-style: solid;
                border-width: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    // Check if tooltip has already been shown by checking localStorage
    hasTooltipBeenShown(id) {
        return localStorage.getItem(`tooltip_shown_${id}`) === 'true';
    }

    // Mark tooltip as shown by saving it in localStorage
    markTooltipAsShown(id) {
        localStorage.setItem(`tooltip_shown_${id}`, 'true');
    }

    // Function to show the tooltip
    showTooltip(targetElement, id, message, buttonText = 'OK', onNext) {
    if (this.hasTooltipBeenShown(id) && !onNext) return;
    if (this.hasTooltipBeenShown(id) && onNext) { onNext(); return; }

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-system-tooltip';
    tooltip.innerHTML = `${message}<div class="tooltip-system-arrow"></div><button class="tooltip-system-button">${buttonText}</button>`;
    document.body.appendChild(tooltip);

    const arrow = tooltip.querySelector('.tooltip-system-arrow');

    const rect = targetElement.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const computed = window.getComputedStyle(targetElement);

    const highlight = document.createElement('div');
    highlight.className = 'tooltip-system-highlight';
    highlight.style.position = 'absolute';
    highlight.style.pointerEvents = 'none';
    highlight.style.zIndex = '999';
    highlight.style.boxSizing = 'border-box';

    highlight.style.left = `${Math.round(rect.left + scrollX)}px`;
    highlight.style.top = `${Math.round(rect.top + scrollY)}px`;
    highlight.style.width = `${Math.round(rect.width)}px`;
    highlight.style.height = `${Math.round(rect.height)}px`;

    const bw = parseFloat(computed.borderLeftWidth) || parseFloat(computed.borderTopWidth) || 0;
    highlight.style.borderWidth = `${Math.max(2, Math.round(bw || 3))}px`;
    highlight.style.borderStyle = 'solid';
    highlight.style.borderColor = 'transparent';
    highlight.style.animation = 'rainbow-border 4s linear infinite';

    highlight.style.borderTopLeftRadius = computed.getPropertyValue('border-top-left-radius') || computed.borderRadius || '0px';
    highlight.style.borderTopRightRadius = computed.getPropertyValue('border-top-right-radius') || computed.borderRadius || '0px';
    highlight.style.borderBottomRightRadius = computed.getPropertyValue('border-bottom-right-radius') || computed.borderRadius || '0px';
    highlight.style.borderBottomLeftRadius = computed.getPropertyValue('border-bottom-left-radius') || computed.borderRadius || '0px';

    document.body.appendChild(highlight);
    targetElement._tooltipHighlight = highlight;

    this.positionTooltip(tooltip, targetElement, arrow);

    setTimeout(() => tooltip.classList.add('tooltip-system-show-tooltip'), 100);

    const button = tooltip.querySelector('.tooltip-system-button');
    button.addEventListener('click', () => {
        if (onNext) onNext();
        this.hideTooltip(tooltip);
        const h = targetElement._tooltipHighlight;
        if (h && h.parentElement) h.parentElement.removeChild(h);
        try { delete targetElement._tooltipHighlight; } catch (e) { targetElement._tooltipHighlight = undefined; }
        this.markTooltipAsShown(id);
    });
}




    // Function to hide the tooltip
    hideTooltip(tooltip) {
        tooltip.classList.remove('tooltip-system-show-tooltip');
        setTimeout(() => {
            if (tooltip && tooltip.parentElement) {
                tooltip.parentElement.removeChild(tooltip);
            }
        }, 300); // Wait for transition
    }

    // Method to dynamically position the tooltip based on available space
    positionTooltip(tooltip, targetElement, arrow) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const topOffset = rect.top + window.scrollY;
        const leftOffset = rect.left + window.scrollX;

        // clear previous position classes
        arrow.className = 'tooltip-system-arrow';

        if (viewportHeight - rect.bottom > tooltipRect.height) {
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset + rect.height + 10}px`;
            arrow.classList.add('top');
            arrow.style.left = '10px';
            arrow.style.top = '';
            arrow.style.transform = '';
        } else if (rect.top > tooltipRect.height) {
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset - tooltipRect.height - 10}px`;
            arrow.classList.add('bottom');
            arrow.style.left = '10px';
            arrow.style.top = '';
            arrow.style.transform = '';
        } else if (viewportWidth - rect.right > tooltipRect.width) {
            tooltip.style.left = `${leftOffset + rect.width + 10}px`;
            tooltip.style.top = `${topOffset}px`;
            arrow.classList.add('left');
            arrow.style.top = `${Math.round((tooltipRect.height / 2) - 5)}px`;
            arrow.style.left = '';
            arrow.style.transform = 'none';
        } else if (rect.left > tooltipRect.width) {
            tooltip.style.left = `${leftOffset - tooltipRect.width - 10}px`;
            tooltip.style.top = `${topOffset}px`;
            arrow.classList.add('right');
            arrow.style.top = `${Math.round((tooltipRect.height / 2) - 5)}px`;
            arrow.style.left = '';
            arrow.style.transform = 'none';
        } else {
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset + rect.height + 10}px`;
            arrow.classList.add('top');
            arrow.style.left = '10px';
            arrow.style.top = '';
            arrow.style.transform = '';
        }
    }


    // Method to attach the tooltip system to elements
    attachTooltip(elementId, id, message, buttonText, onNext) {
        const element = document.getElementById(elementId);
        if (element) {
            setTimeout(() => {
                this.showTooltip(element, id, message, buttonText, onNext);
            }, 500);
        }
    }

    // Clear tooltip storage for debugging or re-showing
    clearTooltipLocalStorage(suffix) {
        const prefix = 'tooltip_shown_';
        if (suffix === '*') suffix = ''; // Wildcard to clear all
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix + suffix)) {
                localStorage.removeItem(key);
                i--; // Adjust index after removal
            }
        }
    }
}
