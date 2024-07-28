function createPopup(title, text, buttons) {
    const popupContainer = document.getElementById('popup-container');

    // Clear any existing content
    popupContainer.innerHTML = '';

    // Create popup elements
    const popup = document.createElement('div');
    popup.className = 'popup';

    const popupTitle = document.createElement('h2');
    popupTitle.innerText = title;
    popup.appendChild(popupTitle);

    const popupText = document.createElement('p');
    popupText.innerText = text;
    popup.appendChild(popupText);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.innerText = button.text;
        btn.onclick = button.onClick;
        buttonContainer.appendChild(btn);
    });

    popup.appendChild(buttonContainer);
    popupContainer.appendChild(popup);

    // Show the popup
    popupContainer.style.visibility = 'visible';
}

function closePopup() {
    const popupContainer = document.getElementById('popup-container');
    popupContainer.style.visibility = 'hidden';
}
