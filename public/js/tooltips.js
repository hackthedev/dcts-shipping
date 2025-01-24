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
        // If the tooltip has already been shown, don't show it again
        if (this.hasTooltipBeenShown(id)) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-system-tooltip';
        tooltip.innerHTML = `
            ${message}
            <div class="tooltip-system-arrow"></div>
            <button class="tooltip-system-button">${buttonText}</button>
        `;
        document.body.appendChild(tooltip);

        const arrow = tooltip.querySelector('.tooltip-system-arrow');

        // Save the original border style to restore it later
        const originalBorderStyle = targetElement.style.border;

        // Add the rainbow border animation
        targetElement.classList.add('tooltip-system-rainbow-border');

        // Position the tooltip based on available space
        this.positionTooltip(tooltip, targetElement, arrow);

        // Show the tooltip
        setTimeout(() => {
            tooltip.classList.add('tooltip-system-show-tooltip');
        }, 100);

        // Add click listener to the button
        const button = tooltip.querySelector('.tooltip-system-button');
        button.addEventListener('click', () => {
            if (onNext) onNext(); // Call the onNext function if provided
            this.hideTooltip(tooltip);

            // Restore the original border style or remove the rainbow border
            targetElement.classList.remove('tooltip-system-rainbow-border');
            targetElement.style.border = originalBorderStyle;

            this.markTooltipAsShown(id); // Mark this tooltip as shown
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
        const rect = targetElement.getBoundingClientRect(); // Get the element's position relative to the viewport
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const topOffset = rect.top + window.scrollY;
        const leftOffset = rect.left + window.scrollX;

        // Try to place tooltip below the element
        if (viewportHeight - rect.bottom > tooltipRect.height) {
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset + rect.height + 10}px`;
            arrow.classList.add('top');
        } else if (rect.top > tooltipRect.height) {
            // Place tooltip above the element
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset - tooltipRect.height - 10}px`;
            arrow.classList.add('bottom');
        } else if (viewportWidth - rect.right > tooltipRect.width) {
            // Place tooltip to the right
            tooltip.style.left = `${leftOffset + rect.width + 10}px`;
            tooltip.style.top = `${topOffset}px`;
            arrow.classList.add('left');
        } else if (rect.left > tooltipRect.width) {
            // Place tooltip to the left
            tooltip.style.left = `${leftOffset - tooltipRect.width - 10}px`;
            tooltip.style.top = `${topOffset}px`;
            arrow.classList.add('right');
        } else {
            // Default to below
            tooltip.style.left = `${leftOffset}px`;
            tooltip.style.top = `${topOffset + rect.height + 10}px`;
            arrow.classList.add('top');
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
