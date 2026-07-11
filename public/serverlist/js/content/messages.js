async function loadMessages(){
    getContentElement().innerHTML =
    `    
        <div class="message-container" style="display: flex; flex-direction: column; margin: auto; justify-content: center;">
            <h1 style="margin-bottom: 0.5rem;">This feature isnt done yet!</h1>
            <p>A lot of work is going into this feature! <a href="https://reddit.com/r/dcts" target="_blank">Checkout our subreddit to stay up to date!</a></p>
            <br><br>
           
            <h2>What is it going to be about?</h2>
            <ul>
                <li>The idea is to use any DCTS instance to forward direct messages between clients without requiring an account.</li>
                <li>Users wont need to be connected to the same server. Any server that participates in the dSync network is compatible.</li>
                <li>These messages can be End-to-End Encrypted just like the normal server DMs, or may even be force-enabled by default.</li>
                <li>This means if you dont need the community aspect of DCTS, you can still use it as some sort of messenger.</li>
            </ul>
        </div>
    `
}