let uptime_match = 0;
let uptime_interval;
let match_started = false;
// FIXED PATH → your current page is /CIKOIN/index.html
// Game folder is /CIKOIN/Game/
const GAME_PATH = "./Game/index.html";

function start_match() {
    if (match_started) return;

    if (typeof enough_player === "undefined" || enough_player < 2) {
        alert("2 Players required to start the match!");
        return;
    }

    match_started = true;

    // reset and start uptime timer
    uptime_match = 0;
    if (uptime_interval) clearInterval(uptime_interval);
    uptime_interval = setInterval(() => {
        uptime_match++;
        console.log("Uptime: " + uptime_match + "s");
    }, 1000);

    // hide menu, show game
    menu_div.style.display = "none"
    window.location.href = "./Game/index.html"; 
}
