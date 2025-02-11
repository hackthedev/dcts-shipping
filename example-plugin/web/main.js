// Example Code
// The main.js file is your entry point (client-side). and will run automatically

let channels = document.querySelectorAll("#channeltree a");

channels.forEach(channel => {
    console.log(channel)
    channel.style.color = "red";
});
