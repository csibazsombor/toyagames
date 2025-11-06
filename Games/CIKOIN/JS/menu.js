let delay_load;
let count = 1;

let player = document.getElementById("who-play");
let team = document.getElementById("team-select");
let character = document.getElementById("character-select");

let menu_div = document.getElementById("menu");
let whoplays_div = document.getElementById("who-plays");
let load_div = document.getElementById("loading");
let team_div = document.getElementById("teams");
let character_div = document.getElementById("characters");
let server_div = document.getElementById("server");
let room_div = document.getElementById("room");

let your_name = null;
let your_team = null;
let your_character = null;

function beep(frequency = 770, duration = 50) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  oscillator.type = "square"; // tone shape
  oscillator.frequency.value = frequency; // Hz (440 = A tone)
  oscillator.connect(ctx.destination);
  oscillator.start();
  setTimeout(() => oscillator.stop(), duration);
}


function Update_player() {
       navigator.vibrate(50);
       beep();
        load_div.style.display = "block";
    // Clear old interval if exist
    if (delay_load) clearInterval(delay_load)
    delay_load = setInterval(() => {
        count++;
        console.log("Delay: " + count);
        if(count == 5) loadgame();
    
    }, 550);   

}    

function Update_team() {
       navigator.vibrate(40);
       if(team.value == null) return;
       if(team.value == "red" || team.value ==  "blue") {
              your_team = team.value,  console.log(your_team);
       }
}

function Update_character() {
       navigator.vibrate(50);
       if(character.value == null) return;
       if(character.value == "ciko" || character.value ==  "cloe" || character.value == "pici catto") {
              your_character = character.value,  console.log(your_character);
                server_div.style.display = "block";
       }
}

function start() {
       navigator.vibrate(100);
       beep();
        if(player.value == null) return;
        if(player.value == "Toya" || player.value == "Toye") {
                whoplays_div.style.display = "none";
                load_div.style.display = "block";
                your_name = player.value, console.log(your_name);
                Update_player();
        }

        else{
                console.log("unknown player" + player);
        }

}

function loadgame(){
        clearInterval(delay_load);
        load_div.style.display = "none";
        document.getElementById("teams").style.display = 'block';
        
}

function accept() {
       beep();
       navigator.vibrate(50);
       if(your_team == null) return;
       else{
              team_div.style.display = "none";
              character_div.style.display = "block";
       }
}