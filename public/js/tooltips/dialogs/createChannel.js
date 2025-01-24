function createChannelTooltip(){
    tooltipSystem.showTooltip(
        document.getElementById('tt_channelCreateDialog_channelName'), // The target element
        'tt_channelCreateDialog_channelName',                      // Unique ID for this tooltip
        'Enter your channel name here.',        // Tooltip message
        'Next',                              // Button text (optional)
        () => {
            tooltipSystem.showTooltip(
                document.getElementById('tt_channelCreateDialog_channelType'),
                'tt_channelCreateDialog_channelType',                  
                'Select the type of channel you want to create',  
                'Next',
                () => {
                    tooltipSystem.showTooltip(
                        document.getElementById('promptsSubmitButton'),
                        'tt_channelCreateDialog_chanelSubmit',                  
                        'Click to create the channel!',  
                        'Got it!'
                    );
                }
            );
        } // Callback when button is clicked (optional)
    );
}