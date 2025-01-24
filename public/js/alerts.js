class CustomAlert {
    constructor() {
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .custom-alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                font-family: Arial, sans-serif;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s ease;
                transform: translateY(-20px);
            }

            .custom-alert.show {
                opacity: 1;
                transform: translateY(0);
            }

            .custom-alert-icon {
                margin-right: 15px;
                font-size: 20px;
            }

            .custom-alert-success {
                border-left: 5px solid #28a745;
            }

            .custom-alert-error {
                border-left: 5px solid #dc3545;
            }

            .custom-alert-info {
                border-left: 5px solid #17a2b8;
            }

            .custom-alert-message {
                flex: 1;
                margin: 0;
                padding-right: 10px;
                font-size: 16px;
                color: #333;
            }

            .custom-alert-close {
                background-color: transparent;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #555;
            }

            .custom-alert-close:hover {
                color: #000;
            }
        `;
        document.head.appendChild(style);
    }

    // Function to display the alert
    showAlert(type, message) {
        const alertBox = document.createElement('div');
        alertBox.classList.add('custom-alert', `custom-alert-${type}`);

        let icon;
        if (type === 'success') {
            icon = '✔️'; // Success icon
        } else if (type === 'error') {
            icon = '❌'; // Error icon
        } else {
            icon = 'ℹ️'; // Info icon
        }

        // Alert box content
        alertBox.innerHTML = `
            <span class="custom-alert-icon">${icon}</span>
            <p class="custom-alert-message">${message}</p>
            <button class="custom-alert-close">&times;</button>
        `;

        document.body.appendChild(alertBox);

        // Add animation class
        setTimeout(() => {
            alertBox.classList.add('show');
        }, 10);

        // Remove the alert after 5 seconds
        setTimeout(() => {
            this.removeAlert(alertBox);
        }, 5000);

        // Close the alert when the close button is clicked
        const closeButton = alertBox.querySelector('.custom-alert-close');
        closeButton.addEventListener('click', () => {
            this.removeAlert(alertBox);
        });
    }

    // Function to remove the alert
    removeAlert(alertBox) {
        alertBox.classList.remove('show');
        setTimeout(() => {
            if (alertBox && alertBox.parentElement) {
                alertBox.parentElement.removeChild(alertBox);
            }
        }, 300);
    }
}
