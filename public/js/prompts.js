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

            .prompt-label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .prompt-input {
                width: 100%;
                padding: 5px;
                font-size: 14px;
                border: 1px solid #ccc;
                border-radius: 2px;
                box-sizing: border-box;                
                background-color: #F0F0F0;
            }

            .prompt-input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }

            .prompt-input:focus {
                border-color:hsl(204, 4.70%, 41.60%);
                outline: none;
            }

            .prompt-button {
                padding: 10px 20px;
                background-color: var(--primary); 
                color: white;
                border: none;
                border-radius: 2px;
                width: calc(100% - 20px);
                cursor: pointer;
                font-size: 14px;
            }

            .prompt-button.submit{
                background-color: var(--secondary); 
            }

            .prompt-button.submit:hover{
                background-color: var(--secondary-hover); 
                transition: var(--transition-all);
            }

            .prompt-button.submit:not(:hover){
                background-color: var(--secondary); 
                transition: var(--transition-all);
            }

            .prompt-click-select{
                padding: 12px;
                border-radius: 2px;
                background-color: var(--primary);
                line-height: 0;
            }

            .prompt-click-select:hover{
                border-radius: 4px;
                transition: var(--transition-all);
                background-color: var(--primary-hover);
            }

            .prompt-click-select:not(:hover){
                border-radius: 2px;
                transition: var(--transition-all);
                background-color: var(--primary);
            }

            .prompt-click-select.selected {
                background-color: var(--primary-selected);
            }

            .prompt-button:hover {
                background-color: var(--primary-hover);
            }

            .profile-image-container {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background-color: #f0f0f0;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid #ccc;
            }

            .profile-image-preview {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: none;
            }

            .profile-image-container:hover {
                border-color: #44484b;
            }            

            /* Style for the select dropdown */
            .prompt-select {
                appearance: none; /* Remove default browser styling */
                background-color: #F0F0F0;
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
                border-color: hsl(204, 4.7%, 41.6%);
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
        `;
        document.head.appendChild(style);
    }

  
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'promptContainer';
        this.modal.style.display = 'none';
        this.modal.style.position = 'fixed';
        this.modal.style.top = '0';
        this.modal.style.left = '0';
        this.modal.style.width = '100%';
        this.modal.style.height = '100%';
        this.modal.style.backgroundColor = 'hsla(0, 0.00%, 0.00%, 0.70)';
        this.modal.style.display = 'flex';
        this.modal.style.justifyContent = 'center';
        this.modal.style.alignItems = 'center';
        document.body.appendChild(this.modal);
    
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#24292E';
        modalContent.style.color = '#F0F0F0';
        modalContent.style.padding = '30px';
        modalContent.style.borderRadius = '10px';
        modalContent.style.textAlign = 'left';
        modalContent.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
    
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
        title.style.fontSize = '18px';
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
        this.closeButton.style.fontSize = '20px';
        this.closeButton.onclick = () => this.closePrompt();
        headerContainer.appendChild(this.closeButton);
    
        modalContent.appendChild(headerContainer);
    
        this.promptContent = document.createElement('div');
        this.promptContent.id = 'promptContent';
        this.promptContent.style.marginTop = '20px';
        modalContent.appendChild(this.promptContent);
    
        // submit button
        this.submitButton = document.createElement('button');
        this.submitButton.className = 'prompt-button submit';
        this.submitButton.innerText = 'Submit';
        this.submitButton.id = 'promptsSubmitButton';
        this.submitButton.style.marginTop = '20px';
        this.submitButton.onclick = () => this.submitPrompt();
        modalContent.appendChild(this.submitButton);
    
        this.modal.appendChild(modalContent);
    }
    

    showPrompt(title = 'Prompt', htmlContent, callback, customSubmitText = null, multiSelect = false, customMinWidth = null, helpAction = null) {
        this.currentCallback = callback;
        this.multiSelect = multiSelect;
        this.selectedValues = multiSelect ? [] : null;
        this.promptContent.innerHTML = htmlContent;
        this.modal.style.display = 'flex';
        this.promptContent.style.minWidth = `${customMinWidth}px` || "";

        // Custom submit button
        let submitButtonColor = customSubmitText ? customSubmitText[1] : "var(--secondary)";
        this.submitButton.innerText = customSubmitText ? customSubmitText[0] : "Submit";

        if (submitButtonColor === "success") {
            this.submitButton.style.backgroundColor = "var(--success)"; // Green for success
        } else if (submitButtonColor === "error") {
            this.submitButton.style.backgroundColor = "var(--error)"; // Red for error
        } else {
            this.submitButton.style.backgroundColor = submitButtonColor;
        }

        // show buttons agin, else hidden
        this.submitButton.style.display = "block";
        this.closeButton.style.display = "block";
        this.helpButton.style.display = "block";
    
        // Update the title
        const titleElement = this.modal.querySelector('h2');
        if (titleElement) {
            titleElement.innerText = title;
        }
    
        // Set up the help button
        if (helpAction) {
            this.helpButton.style.display = 'inline'; // Show the help button
            this.helpButton.onclick = helpAction;    // Set the help action
        } else {
            this.helpButton.style.display = 'none';  // Hide the help button if no action is set
        }
    }

    showConfirm(titleText, options, callback) {
        this.currentCallback = callback;
    
        // Update the title
        const titleElement = this.modal.querySelector('h2'); // Use the existing title element
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
        buttonContainer.style.marginTop = '20px'; // Optional: Add space above the buttons
    
        // Create buttons for each option
        options.forEach(([label, color]) => {
            const button = document.createElement('button');
            button.className = 'prompt-button';
            button.innerText = label;
    
            // Apply custom color based on the second element of the array
            if (color) {
                if (color === "success") {
                    button.style.backgroundColor = "var(--success)"; // Green for success
                    button.style.color = "#fff";
                } else if (color === "error") {
                    button.style.backgroundColor = "var(--error)"; // Red for error
                    button.style.color = "#fff";
                } else {
                    button.style.backgroundColor = color || "var(--primary)"; // Use custom colors if provided
                    button.style.color = "#fff";
                }
            }
    
            button.onclick = () => {
                this.closePrompt();
                if (this.currentCallback) {
                    this.currentCallback(label.toLowerCase()); // Return the selected option label
                }
            };
            buttonContainer.appendChild(button); // Append each button to the container
        });
    
        this.promptContent.appendChild(buttonContainer); // Add the button container to the modal content
    
        // Show the modal
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
    

    closePrompt() {
        this.modal.style.display = 'none';
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
        const inputs = this.promptContent.querySelectorAll('input, select, textarea');
        let values = { selected: this.selectedValues };
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                values[input.name] = input.checked;
            } else if (input.type === 'file') {
                values[input.name] = input.files[0];
            } else {
                values[input.name] = input.value;
            }
        });

        this.closePrompt();
        if (this.currentCallback) {
            this.currentCallback(values);
        }
    }
}

