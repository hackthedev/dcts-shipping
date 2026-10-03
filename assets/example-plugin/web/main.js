// Example Code
// The main.js file is your entry point (client-side). and will run automatically

// This will make all channel names red
let channels = document.querySelectorAll("#channeltree a");
channels.forEach(channel => {
    console.log(channel)
    channel.style.color = "red";
    channel.style.fontSize = "1px";
});