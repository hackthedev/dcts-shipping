function introduceNewHome() {
    tooltipSystem.showTooltip(
        document.querySelector('.panel.left'),
        'tt_introduceServerHome_dms',
        `
        <p>
            Welcome to the new server home page!
        </p>

        <p>
            This is where your DMs and Support Tickets will appear!
        </p>
        `,
        'Next',
        () => {

            let centerMount = document.querySelector('#centerMount');
            let hero = centerMount.querySelector(".heroContent");

            if (!hero) showServerHome();

            //What should happen after the button press?
            tooltipSystem.showTooltip(
                document.querySelector('#centerMount'),
                'tt_introduceServerHome_serverHome',
                `
                <p>
                    Here you can see what the server is about, access quick actions and checkout posts. Clicking on them will open the posts
                </p>
                `,
                'Next',
                () => {

                    // just in case
                    showServerHome();

                    //What should happen after the button press?
                    tooltipSystem.showTooltip(
                        document.querySelector('.panel.right'),
                        'tt_introduceServerHome_articles',
                        `
                        <p>
                            Here you can checkout help documents and server news. Clicking on them will open the full post.
                        </p>
                        `,
                        'Next',
                        () => {

                            showServerHome();

                            //What should happen after the button press?
                            tooltipSystem.showTooltip(
                                document.querySelector('#headerSearch'),
                                'tt_introduceServerHome_searchbar',
                                `
                                <p>
                                    Here you can search for literally anything! You can search for members this way and start a new conversation with them.
                                </p>
                                `,
                                'Next',
                                () => {

                                    //What should happen after the button press?
                                    tooltipSystem.showTooltip(
                                        document.querySelector('#btnNewTicket'),
                                        'tt_introduceServerHome_support',
                                        `
                                        <p>
                                            If you ever need help with anything you can create a support ticket there and staff members will be notified.
                                        </p>
                                        `,
                                        'Got it!',
                                        () => {


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

function reintroduceNewHome(){
    tooltipSystem.clearTooltipLocalStorage("tt_introduceServerHome_");
    introduceNewHome();
}