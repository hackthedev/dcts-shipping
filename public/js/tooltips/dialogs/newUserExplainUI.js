function newUserExplainUI() {

    tooltipSystem.clearTooltipLocalStorage("tt_newUserExplainUI_");

    tooltipSystem.showTooltip(
        document.getElementById('channeltree'),
        'tt_newUserExplainUI_channeltree',
        `This is the channel list. You can click on a text channel to chat or a voice channel to talk to others.`, // Tooltip message
        'Next', // Button text (optional)

        () => {

            //What should happen after the button press?
            tooltipSystem.showTooltip(
                document.getElementById('serverlist'),
                'tt_newUserExplainUI_grouplist',
                `
                <p>
                    This is the group list. Each group has their own channels. For example, there could be a public group for users and a private group for admins.
                </p>
                
                <p>
                    A server may have multipe groups, like a general group for chatting etc and a second group for getting help from staff.
                </p>

                <p>
                    By clicking on the home icon you can open up the server home page, view and write DMs, check what the server is about and read articles.
                </p>
                `,
                'Next',
                () => {

                    //What should happen after the button press?
                    tooltipSystem.showTooltip(
                        document.getElementById('infolist'),
                        'tt_newUserExplainUI_memberlist',
                        'Here we have the member list! It will only list members that have access to the current group or channel.',
                        "Next",
                        () => {

                            //What should happen after the button press?
                            tooltipSystem.showTooltip(
                                document.querySelector("#profile-qa"),
                                'tt_newUserExplainUI_profile',
                                'You can customize your profile by clicking on the settings icon on the right.',
                                'Got it!'
                                ),
                                "Alright!",
                                () => {

                                }

                        })
                }
            );
        }
    );
}