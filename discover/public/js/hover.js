/*
    Author: HackTheDev
*/

function applyHoverEffect(element, colors) {
    if (!element || colors.length < 2) return;

    let [beforeHover, afterHover] = colors;

    // Function to resolve CSS variables if used
    function resolveColor(color) {
        return color.startsWith("--") ? getComputedStyle(document.documentElement).getPropertyValue(color).trim() : color;
    }

    let textBefore = resolveColor(beforeHover[0]);
    let bgBefore = resolveColor(beforeHover[1]);
    let textAfter = resolveColor(afterHover[0]);
    let bgAfter = resolveColor(afterHover[1]);

    // Apply initial styles
    element.style.color = textBefore;
    element.style.backgroundColor = bgBefore;
    element.style.position = "relative"; 
    element.style.overflow = "hidden"; 
    element.style.transition = "color 0.5s ease-in-out, background-color 0.5s ease-in-out";

    // Ensure text is centered and above the gradient
    element.style.display = "inline-flex";
    element.style.alignItems = "center";
    element.style.justifyContent = "center";
    element.style.zIndex = "1"; 

    // Create a span wrapper for text to ensure it's on top
    let textWrapper = document.createElement("span");
    textWrapper.innerHTML = element.innerHTML;
    textWrapper.style.position = "relative"; 
    textWrapper.style.zIndex = "2";
    textWrapper.style.transition = "color 0.5s ease-in-out";

    // Create the gradient layer
    let gradientLayer = document.createElement("div");
    gradientLayer.style.position = "absolute";
    gradientLayer.style.top = "0";
    gradientLayer.style.left = "0";
    gradientLayer.style.width = "100%";
    gradientLayer.style.height = "100%";
    gradientLayer.style.backgroundImage = `linear-gradient(to right, ${bgAfter} 0%, ${bgAfter} 50%, ${bgBefore} 50%, ${bgBefore} 100%)`;
    gradientLayer.style.backgroundSize = "200% 100%";
    gradientLayer.style.backgroundPosition = "100% 0";
    gradientLayer.style.transition = "opacity 0.5s ease-in-out, background-position 0.5s ease-in-out";
    gradientLayer.style.opacity = "0"; 
    gradientLayer.style.pointerEvents = "none"; 
    gradientLayer.style.zIndex = "0"; 

    // Clear existing content and apply the new structure
    element.innerHTML = "";
    element.appendChild(gradientLayer);
    element.appendChild(textWrapper);

    // Hover effect
    element.addEventListener("mouseenter", () => {
        gradientLayer.style.opacity = "1"; 
        gradientLayer.style.backgroundPosition = "0 0"; 
        textWrapper.style.color = textAfter; 
    });

    // Reset effect on mouse leave
    element.addEventListener("mouseleave", () => {
        gradientLayer.style.opacity = "0"; 
        gradientLayer.style.backgroundPosition = "100% 0"; 
        textWrapper.style.color = textBefore;
    });
}
