function muteUserTooltip(){
    tooltipSystem.showTooltip(
        document.getElementById('tt_muteUserDialog_muteReason'), // The target element
        'tt_muteUserDialog_muteReason', // Unique ID for this tooltip
        `[Optional Field]<br>
        You can specify a mute reason and it will be displayed to the user. To not show anything, keep this field empty as its optional.`, // Tooltip message
        'Next', // Button text (optional)
        () => {
            //What should happen after the button press?
            tooltipSystem.showTooltip(
                document.getElementById('tt_muteUserDialog_muteDurationNumber'),
                'tt_muteUserDialog_muteDurationNumber',                  
                `Here you need to input a number. For example "10". In the next field you can select the duration type.`,  
                'Next',
                () => {
                    tooltipSystem.showTooltip(
                        document.getElementById('tt_muteUserDialog_muteDurationType'),
                        'tt_muteUserDialog_muteDurationType',                  
                        'Here you can select the duration of the mute, like minutes, weeks, months or permanent.',  
                        'Got it!'
                    );
                }
            );
        }
    );
}