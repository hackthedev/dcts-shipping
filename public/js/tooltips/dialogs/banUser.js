function banUserTooltip(){
    tooltipSystem.showTooltip(
        document.getElementById('tt_banUserDialog_banReason'), // The target element
        'tt_banUserDialog_banReason', // Unique ID for this tooltip
        `[Optional Field]<br>
        You can specify a ban reason and it will be displayed to the user. To not show anything, keep this field empty as its optional.`, // Tooltip message
        'Next', // Button text (optional)
        () => {
            //What should happen after the button press?
            tooltipSystem.showTooltip(
                document.getElementById('tt_banUserDialog_banDurationNumber'),
                'tt_banUserDialog_banDurationNumber',                  
                `Here you need to input a number. For example "4". In the next field you can select the duration type.`,  
                'Next',
                () => {
                    tooltipSystem.showTooltip(
                        document.getElementById('tt_banUserDialog_banDurationType'),
                        'tt_banUserDialog_banDurationType',                  
                        'Here you can select the duration of the ban, like minutes, weeks, months or permanent.',  
                        'Got it!'
                    );
                }
            );
        }
    );
}