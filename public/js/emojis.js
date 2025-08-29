let emojiList = []; // Store emoji names with IDs
let suggestionsIndex = -1; // Tracks the currently selected suggestion
let matches = []; // Stores the filtered emoji list

let emojiElement;

function fetchEmojis() {
    return new Promise((resolve, reject) => {
        socket.emit("getEmojis",
            { id: UserManager.getID(), token: UserManager.getToken() },
            function (response) {
                if (response.type === "success") {
                    emojiList = response.data;
                    resolve(emojiList); 
                } else {
                    console.log("Failed to fetch emojis:", response.msg);
                    reject(response.msg);
                }
            }
        );
    });
}


function initializeEmojiAutocomplete(element, quill) {

    fetchEmojis()

    // Listen for text-change events from Quill
    quill.on('text-change', function (delta, oldDelta, source) {
        const inputValue = quill.getText(); // Get plain text from the editor
        const selection = quill.getSelection();
        if (!selection) return; // If there's no cursor, skip

        const cursorPosition = selection.index; // Get the current cursor position

        // Get text up to the cursor position
        const textBeforeCursor = inputValue.slice(0, cursorPosition);

        // Match the last ":term" pattern
        const match = textBeforeCursor.match(/:(\w*)$/); // Looks for ":word"

        if (match) {
            const searchTerm = match[1]; // Extract the term after ":"

            if (searchTerm.length > 0) {
                matches = emojiList.filter(emoji => emoji.includes(`_${searchTerm}`));
                if (matches.length > 0) {
                    suggestionsIndex = -1; // Reset selection index
                    showSuggestions(matches, element, cursorPosition);
                } else {
                    hideSuggestions();
                }
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
    });

    // Show suggestions
    function showSuggestions(matches, inputField, cursorPosition) {
        let suggestionsContainer = document.getElementById("emoji-suggestions");

        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement("div");
            suggestionsContainer.id = "emoji-suggestions";
            suggestionsContainer.style.position = "absolute";
            suggestionsContainer.style.zIndex = "1000";
            suggestionsContainer.style.background = "#24292E";
            suggestionsContainer.style.color = "white";
            suggestionsContainer.style.border = "1px solid #60676e";
            suggestionsContainer.style.padding = "-5px";
            suggestionsContainer.style.maxWidth = "400px";
            suggestionsContainer.style.maxHeight = "250px";
            suggestionsContainer.style.overflowY = "auto";
            document.body.appendChild(suggestionsContainer);
        }

        // Populate suggestions and ensure height consistency
        suggestionsContainer.innerHTML = "";
        matches.forEach((match, index) => {
            const suggestion = document.createElement("div");
            suggestion.style.padding = "10px";
            suggestion.style.cursor = "pointer";
            suggestion.style.display = "flex";
            suggestion.style.alignItems = "center";
            suggestion.className = "emoji-suggestion-entry";
            suggestion.setAttribute("data-index", index);

            // Extract Emoji Details
            const [id, name] = extractEmojiDetails(match);

            // Emoji Image
            const emojiImage = document.createElement("img");
            emojiImage.src = `/emojis/${match}`; // Full path to the emoji image
            emojiImage.style.width = "25px";
            emojiImage.style.height = "25px";
            emojiImage.style.marginRight = "8px";

            // Emoji Name
            const emojiName = document.createElement("span");
            emojiName.textContent = name; // Show the clean emoji name

            suggestion.appendChild(emojiImage);
            suggestion.appendChild(emojiName);

            suggestion.addEventListener("click", () => {
                insertEmoji(match, quill, cursorPosition);
                hideSuggestions();
            });
            suggestionsContainer.appendChild(suggestion);
        });

        // Ensure the dropdown's position is updated dynamically
        adjustDropdownPosition(suggestionsContainer, inputField);
    }

    function adjustDropdownPosition(suggestionsContainer, inputField) {
        const rect = inputField.getBoundingClientRect();
        const dropdownHeight = suggestionsContainer.offsetHeight;

        // Check if there’s enough space above or below
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // If there's more space below, position it below; otherwise, position above
        if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
            suggestionsContainer.style.top = `${rect.bottom + window.scrollY}px`; // Below input
        } else {
            suggestionsContainer.style.top = `${rect.top + window.scrollY - dropdownHeight - 5}px`; // Above input
        }

        // Align horizontally
        suggestionsContainer.style.left = `${rect.left + window.scrollX}px`;
        suggestionsContainer.style.width = `${rect.width}px`; // Match input field width
    }

    // Hide suggestions
    function hideSuggestions() {
        const suggestionsContainer = document.getElementById("emoji-suggestions");
        if (suggestionsContainer) {
            suggestionsContainer.remove();
        }
    }

    // Insert selected emoji
    function insertEmoji(emojiFullName, quill, cursorPosition) {
        const inputValue = quill.getText();
        const textBeforeCursor = inputValue.slice(0, cursorPosition);
        const colonIndex = textBeforeCursor.lastIndexOf(":");

        // Extract the emoji ID (e.g., "emoji_123456789_name.png" -> "123456789")
        const emojiId = extractEmojiDetails(emojiFullName)[0];

        // Replace ":term" with ":emojiid:"
        const emojiCode = `:${emojiId}:`;
        quill.deleteText(colonIndex, cursorPosition - colonIndex); // Delete ":term"
        quill.insertText(colonIndex, emojiCode); // Insert ":emojiid:"
        quill.setSelection(colonIndex + emojiCode.length); // Move cursor after the emoji code
    }


    // Extract emoji details
    function extractEmojiDetails(emojiFullName) {
        const parts = emojiFullName.split('_');
        const id = parts[1];
        const nameWithExtension = parts.slice(2).join('_');
        const name = nameWithExtension.split('.')[0]; // Remove file extension
        return [id, name];
    }
}

async function text2Emoji(text, returnCodeOnly = false) {

    if (emojiList.length == 0) {
        await fetchEmojis()
    }

    // Helper function to find emoji filename by ID
    function findEmojiByID(emojiId) {
        const result = emojiList.find(emoji => emoji.includes(`_${emojiId}_`)) || null;
        return result;
    }

    // Check if the message contains only emoji codes
    function isOnlyEmoji(message) {
        const textWithoutEmoji = message.replace(/:(\d+):/g, "").trim().replaceAll(" ", "").replace("<p></p>", "");
        return textWithoutEmoji.length === 0;
    }

    // Replace all :emojiid: patterns with the corresponding output
    const replacedText = text.replace(/:(\d+):/g, (match, emojiId) => {

        const emojiFile = findEmojiByID(emojiId);
        if (emojiFile) {
            const emojiName = extractEmojiDetails(emojiFile)[1]; // Extract emoji name

            // Check if the message is only emojis
            const sendBigEmoji = isOnlyEmoji(text) ? "big" : ""; // Adjust class

            if (returnCodeOnly) {
                // Return the HTML-formatted emoji code
                return `<span><img title="${emojiName}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiFile}"></span>`;
            }

            // Return the full HTML structure for the emoji
            return `<span><img title="${emojiName}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${emojiFile}"></span>`;
        }

        console.log(`Emoji ID ${emojiId} not found, returning original text.`);
        return match; // If not found, leave the text as is
    });

    return replacedText;
}





function extractEmojiDetails(emojiFullName) {
    const parts = emojiFullName.split('_');
    const id = parts[1]; // Extract the emoji ID
    const nameWithExtension = parts.slice(2).join('_');
    const name = nameWithExtension.split('.')[0]; // Extract the name without extension
    return [id, name];
}


function findEmojiByID(emojiId) {
    return emojiList.find(emoji => emoji.includes(`_${emojiId}_`)) || null;
}