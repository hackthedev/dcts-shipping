class Prompt {
    constructor() {
        this.addStyles();  // Add the custom styles
        this.createModal();
        this.currentCallback = null;
        this.selectedValues = []; // Store selected values for select feature
        this.multiSelect = false; // Single or multi-select mode
        this.closePrompt();
    }

    addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .prompt-form-group {
                margin-bottom: 20px;
            }
            
            .prompt-form-group label{
                user-select: none;
            }
            
            #promptContainer a {
                color: hsl(from var(--main) h calc(s * 12) calc(l * 8.5) / 100%);
                font-style: italic;
                cursor: pointer !important;
            }

            .prompt-label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
                font-size: 14px;       
            }

            .prompt-input {
                width: 100%;
                padding: 10px;
                font-size: 14px;
                border: 1px solid rgb(98, 98, 98) !important;
                border-radius: 4px;
                box-sizing: border-box;                
                background-color: transparent;
                color: #ccc;
            }

            .prompt-input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }

            .prompt-input:focus {
                border-color:rgb(98, 98, 98);
                outline: none;
                user-select: none;
            }

            .prompt-button {
                padding: 10px 20px; 
                color: white;
                border: none;
                border-radius: 2px;
                width: calc(100% - 20px);
                cursor: pointer;
                font-size: 14px;
                border: 1px solid rgb(98, 98, 98);
                background-color: transparent;
                user-select: none;
                outline: none;
            }

            .prompt-button.submit{
                background-color: #2492c9; 
                width: 100%;
            }

            .prompt-button.submit:hover{
                background-color: var(--secondary-hover); 
                transition: all 200ms;
            }

            .prompt-button.submit:not(:hover){
                background-color: #2492c9; 
                transition: all 200ms;
            }

            .prompt-click-select{
                padding: 12px;
                border-radius: 2px;
                background-color:#34383C;
                line-height: 0;
            }

            .prompt-click-select:hover{
                border-radius: 4px;
                transition: all 200ms;
                background-color: color-mix(in srgb,#34383C 80%, white 20%);
            }

            .prompt-click-select:not(:hover){
                border-radius: 2px;
                transition: all 200ms;
                background-color:#34383C;
            }

            .prompt-click-select.selected {
                background-color: color-mix(in srgb, #34383C 80%, white 40%);
            }

            .prompt-button:hover {
                background-color: color-mix(in srgb,#34383C 80%, white 20%);
            }

            .profile-image-container {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                cursor: pointer;
                border: 1px solid rgb(98, 98, 98);
                background-color: transparent;

                object-fit: cover;
                background-size: cover;
                background-position: center center;
            }

            .profile-image-preview {
                width: 100%;
                height: 100%;

                object-fit: cover;
                background-size: cover;
                background-position: center center;

                display: none;
            }

            .profile-image-container:hover {
                border-color: #44484b;
            }            

            /* Style for the select dropdown */
            .prompt-select {
                appearance: none; /* Remove default browser styling */
                background-color:rgb(207, 205, 205);
                color: black;
                padding: 5px;
                font-size: 14px;
                border: 1px solid #ccc;
                border-radius: 2px;
                width: 100%;
                box-sizing: border-box;
                cursor: pointer;
                margin-top: 10px;
            }

            /* Add focus effect for better UX */
            .prompt-select:focus {
                border-color: rgb(98, 98, 98);
                outline: none;
            }

            /* Dropdown arrow styling */
            .prompt-select::-ms-expand {
                display: none; /* Remove default dropdown arrow in Edge/IE */
            }

            /* Optional hover effect */
            .prompt-select:hover {
                background-color: #E0E0E0;
            }

            .prompt-note{
                font-size: 12px;
                font-style: italic;
                color: #727272ff
            }
        `;
        document.head.appendChild(style);
    }


    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'promptContainer';
        this.modal.style.display = 'none';
        this.modal.style.overflowY = 'auto';
        this.modal.style.position = 'fixed';
        this.modal.style.top = '0';
        this.modal.style.left = '0';
        this.modal.style.width = '100%';
        this.modal.style.height = '100%';
        this.modal.style.backgroundColor = 'hsla(0, 0.00%, 0.00%, 0.70)';
        this.modal.style.display = 'flex';
        this.modal.style.justifyContent = 'center';
        this.modal.style.alignItems = 'center';
        this.modal.style.zIndex = '30';
        document.body.appendChild(this.modal);

        this.modalContent = document.createElement('div');
        if(!this.modalContent?.classList?.contains("prompt-content")) this.modalContent.classList.add('prompt-content');
        this.modalContent.style.backgroundColor = '#24292E';
        this.modalContent.style.color = '#F0F0F0';
        this.modalContent.style.padding = '30px';
        this.modalContent.style.borderRadius = '10px';
        this.modalContent.style.textAlign = 'left';
        this.modalContent.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';

        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.marginBottom = '10px';

        // Title and Help Button Container
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.gap = '10px'; // Space between title and help button

        // Title
        const title = document.createElement('h2');
        title.style.margin = '0';
        title.style.fontSize = '24px';
        title.style.userSelect = 'none';
        title.innerText = 'Create a Channel'; // Default title
        titleContainer.appendChild(title);

        // Help Button (?)
        this.helpButton = document.createElement('span');
        this.helpButton.innerHTML = '?';
        this.helpButton.style.cursor = 'pointer';
        this.helpButton.style.fontSize = '12px';
        this.helpButton.style.color = '#F0F0F0';
        this.helpButton.style.borderRadius = '50%';
        this.helpButton.style.border = '1px solid var(--primary-text)';
        this.helpButton.style.padding = '0px 4px';
        this.helpButton.title = 'Help';
        this.helpButton.style.display = 'none'; // Initially hidden
        titleContainer.appendChild(this.helpButton);

        headerContainer.appendChild(titleContainer);

        // Close Button (X)
        this.closeButton = document.createElement('span');
        this.closeButton.innerHTML = '&times;';
        this.closeButton.style.cursor = 'pointer';
        this.closeButton.style.userSelect = 'none';
        this.closeButton.style.fontSize = '20px';
        this.closeButton.onclick = () => this.closePrompt();
        headerContainer.appendChild(this.closeButton);

        this.modalContent.appendChild(headerContainer);

        this.promptContent = document.createElement('div');
        this.promptContent.id = 'promptContent';
        this.promptContent.style.marginTop = '20px';
        this.modalContent.appendChild(this.promptContent);

        // submit button
        this.submitButton = document.createElement('button');
        this.submitButton.className = 'prompt-button submit';
        this.submitButton.innerText = 'Submit';
        this.submitButton.id = 'promptsSubmitButton';
        this.submitButton.style.marginTop = '20px';
        this.submitButton.onclick = () => this.submitPrompt();
        this.modalContent.appendChild(this.submitButton);

        this.modal.appendChild(this.modalContent);
    }


    showPrompt(title = 'Prompt', htmlContent, callback, customSubmitText = null, multiSelect = false, customMinWidth = null, helpAction = null, afterSubmitAction = null, disableSubmit = false, disableExit = false) {
        this.currentCallback = callback;
        this.afterSubmitAction = afterSubmitAction; // Store the afterSubmitAction function
        this.multiSelect = multiSelect;
        this.selectedValues = multiSelect ? [] : null;
        this.promptContent.innerHTML = htmlContent;
        this.modal.style.display = 'flex';
        this.promptContent.style.minWidth = `${customMinWidth}px` || "";

        // reset colors just in case
        this.modalContent.style.backgroundColor = '#24292E';
        this.modalContent.style.color = '#F0F0F0';

        // Custom submit button color and text
        let submitButtonColor = customSubmitText ? customSubmitText[1] : "#2492c9";
        this.submitButton.innerText = customSubmitText ? customSubmitText[0] : "Submit";

        if (submitButtonColor === "success") {
            this.submitButton.style.backgroundColor = "#5CCD5C"; // Green for success
        } else if (submitButtonColor === "error") {
            this.submitButton.style.backgroundColor = "indianred"; // Red for error
        } else {
            this.submitButton.style.backgroundColor = submitButtonColor;
        }

        // Show buttons
        this.submitButton.style.display = "block";
        this.closeButton.style.display = "block";
        this.helpButton.style.display = "block";

        if (disableSubmit) this.submitButton.style.display = "none";
        if (disableExit) this.closeButton.style.display = "none";

        // Update the title
        const titleElement = this.modal.querySelector('h2');
        if (titleElement) {
            titleElement.innerText = title;
        }

        // Set up the help button
        if (helpAction) {
            this.helpButton.style.display = 'inline';
            this.helpButton.onclick = helpAction;
        } else {
            this.helpButton.style.display = 'none';
        }

        if (customSubmitText) {
            if (!customSubmitText[1]) applyHoverEffect(this.submitButton, [["white", "#2492c9"], ["white", "#4bc732"]])

            //this.submitButton.style.width = "100%";
        }
    }

    showConfirm(titleText, options, callback, afterSubmitAction = null) {
        this.currentCallback = callback;
        this.afterSubmitAction = afterSubmitAction;

        // Update the title
        const titleElement = this.modal.querySelector('h2');
        if (titleElement) {
            titleElement.innerText = titleText;
        }

        // Clear the previous content
        this.promptContent.innerHTML = '';

        // Hide the submit button for the confirm dialog
        this.submitButton.style.display = 'none';
        this.helpButton.style.display = 'none';
        this.closeButton.style.display = 'none';

        // Create a container for the buttons with flex display
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px'; // Add space between buttons
        buttonContainer.style.justifyContent = 'center'; // Center-align the buttons
        buttonContainer.style.marginTop = '20px';

        // Create buttons for each option
        options.forEach(([label, color]) => {
            const button = document.createElement('button');
            button.className = 'prompt-button';
            button.innerText = label;

            // Apply custom color
            if (color) {
                if (color === "success") {
                    button.style.backgroundColor = "#5CCD5C"; // Green for success
                    button.style.color = "#fff";
                } else if (color === "error") {
                    button.style.backgroundColor = "indianred"; // Red for error
                    button.style.color = "#fff";
                } else {
                    button.style.backgroundColor = color || "#2B3035";
                    button.style.color = "#fff";
                }
            }

            button.onclick = () => {
                this.closePrompt(false); // Indicate that this was a valid selection

                // Ensure callback is executed only once
                if (this.currentCallback) {
                    this.currentCallback(label.toLowerCase());
                    this.currentCallback = null; // Prevent duplicate execution
                }

                if (this.afterSubmitAction) {
                    this.afterSubmitAction({ canceled: false, selectedOption: label.toLowerCase() });
                }
            };

            buttonContainer.appendChild(button);
        });

        this.promptContent.appendChild(buttonContainer);
        this.modal.style.display = 'flex';
    }






    handleSelect(element, value) {
        if (this.multiSelect) {
            if (this.selectedValues.includes(value)) {
                this.selectedValues = this.selectedValues.filter(v => v !== value);
                element.classList.remove('selected');
            } else {
                this.selectedValues.push(value);
                element.classList.add('selected');
            }
        } else {
            if (this.selectedValues === value) return;

            this.selectedValues = value;
            document.querySelectorAll('.prompt-click-select').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
        }
    }


    closePrompt(canceled = true) {
        this.modal.style.display = 'none';

        if (!canceled && this.currentCallback) {
            this.currentCallback({ canceled });
        }

        if (this.afterSubmitAction) {
            this.afterSubmitAction({ canceled, values: null });
        }

        // Only reset the callback if it wasn't from `showConfirm()`
        if (canceled) {
            this.currentCallback = null;
        }
    }





    previewImage(event) {
        const inputId = event.target.id;
        const imagePreviewId = inputId + 'Preview';  // Assuming the preview element has the id matching the input id with "Preview" suffix
        const imagePreview = document.getElementById(imagePreviewId);
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    }


    submitPrompt() {
        const inputs = this.promptContent.querySelectorAll('input, select, textarea, [data-name]');
        let values = { selected: this.selectedValues };

        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                values[input.name] = input.checked;
            } else if (input.type === 'file') {
                values[input.name] = input.files[0];
            } else if (input.tagName === 'DIV' || input.tagName === 'P') {
                values[input.dataset.name] = input.cloneNode(true);
            } else {
                values[input.name] = input.value;
            }
        });

        if (this.currentCallback) {
            this.currentCallback(values);
            this.currentCallback = null;
        }

        if (this.afterSubmitAction) {
            this.afterSubmitAction({ canceled: false, values });
        }

        this.closePrompt(false);
    }



}