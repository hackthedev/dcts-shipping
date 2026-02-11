function doAccountOnboardingTooltip(){
    tooltipSystem.clearTooltipLocalStorage("tt_accountOnboardingUserDialog_");
    tooltipSystem.showTooltip(
        document.querySelector('#tt_accountOnboardingUserDialog #username'), // The target element
        'tt_accountOnboardingUserDialog_username', // Unique ID for this tooltip
        `Your display name is the name that will be displayed on the server.`, // Tooltip message
        'Next', // Button text (optional)
        () => {

            //What should happen after the button press?
            tooltipSystem.showTooltip(
                document.querySelector('#tt_accountOnboardingUserDialog #loginName'),
                'tt_accountOnboardingUserDialog_loginName',                  
                `Your login name is not displayed to anyone and used for logging into your account. Dont forget it!`,  
                'Next',
                () => {

                    tooltipSystem.showTooltip(
                        document.querySelector('#tt_accountOnboardingUserDialog #password'),
                        'tt_accountOnboardingUserDialog_password',                  
                        `Make sure to choose a secure password for your account.`,  
                        'Next',
                        () => {

                            tooltipSystem.showTooltip(
                                document.querySelector('#tt_accountOnboardingUserDialog #repeatedPassword'),
                                'tt_accountOnboardingUserDialog_repeatedPassword',                  
                                `Type the same password again.`,  
                                'Next',
                                () => {
                                    
                                    tooltipSystem.showTooltip(
                                        document.querySelector('#tt_accountOnboardingUserDialog #profileImageContainer'),
                                        'tt_accountOnboardingUserDialog_profileImageContainer',                  
                                        `You can click to choose your profile picture. It can be edited later as well.`,  
                                        'Next',
                                        () => {
                                            
                                            tooltipSystem.showTooltip(
                                                document.querySelector('#tt_accountOnboardingUserDialog #bannerImageContainer'),
                                                'tt_accountOnboardingUserDialog_bannerImageContainer',                  
                                                `Here you can choose your banner image. You can edit it later in your account settings`,  
                                                'Next'
                                            );   
                                        }
                                    );     
                                }
                            );                            
                        }
                    );
                }
            );
        }
    );
}