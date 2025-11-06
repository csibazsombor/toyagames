let uptime_match = 0;
let uptime_interval;
let match_started = false;

let game_div = document.getElementById("game");

function start_match() {
    if(match_started == true) return;
    if(enough_player == 2) {
        // reset count
        uptime_match = 0;

        // stop old interval
        if (uptime_interval) clearInterval(uptime_interval);

        // start new interval
        uptime_interval = setInterval(() => {
          uptime_match++;
          console.log("Uptime: " + uptime_match + "s");
        }, 1000);
        match_started = true;
        game_div.style.display = "block";
    } else { 
        console.warn("2 player required to play!");
        alert("2 Player required to play!")
        return;
    }

}
