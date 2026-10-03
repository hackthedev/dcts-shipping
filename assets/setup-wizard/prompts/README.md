# Custom Prompts

This library was made to offer an advanced alternative to the native alert, prompt and confirm functions by creating a new class with custom elements etc.

---

## Examples

```js
let customPrompts = new Prompt();

customPrompts.showPrompt(
            "Ban User", // prompt title
            ` 
            <div class="prompt-form-group">
                <label class="prompt-label" for="banReason">Reason (optional)</label>
                <input class="prompt-input" id="tt_banUserDialog_banReason" type="text" name="banReason">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="banDurationType">Ban Duration Type</label>            
                <input class="prompt-input" type="number" id="tt_banUserDialog_banDurationNumber" min="0" step="1" name="banDurationNumber" placeholder="Number in days, e.g. 7">
                
                <select class="prompt-input prompt-select" id="tt_banUserDialog_banDurationType" name="banDurationType">
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option default selected value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="perma">Permanent</option>
                </select>
            </div>
    
            `, // html to display
            (values) => { // on submit callback
                console.log('Submitted Values:', values);
                // values are based on the 'name' property of elements

                let banReason = values.banReason;
                let banDuration = `${Math.floor(values.banDurationNumber)} ${values.banDurationType}`

                socket.emit("banUser", {
                    reason: banReason,
                    duration: banDuration
                }, function (response) {
                    // do whatever...
                });
            },
            ["Ban", "error"], // custom submit text and color
            false, // multi select if relevant
            250, // optional minimum width
            () => { // help action callback. will show help icon
                banUserTooltip();
            },
            afterSubmitAction, // what to do after submit and after the submit callback
    		false, // optional, disable submit button or not (e.g. notices, banned messages, ...)
    		false // disables the close icon,
        );


// Confirm dialog
customPrompts.showConfirm("Remove this member from the chat?",
        [ // options
    		["Yes", "success"], // [text, color]
         	["No", "error"] // [text, color]
		],
        async (selected) => {
            if (selected !== "yes") return;
            let res = await removeDmRoomParticipant(roomId, memberId);
            if (res?.error) console.error("remove participant failed:", res.error);
        },
        afterSubmitAction // after submit and after callback callback 
    )

// example of what this would look like
let afterSubmitAction = async() => {
    // confirm = { canceled: false, selectedOption: selected }
    // prompt = { canceled: false, values }
}
```

