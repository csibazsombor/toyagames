let delay_load;
let count = 1;

let player = document.getElementById("who-play");
let character = document.getElementById("character-select");

let menu_div = document.getElementById("menu");
let whoplays_div = document.getElementById("who-plays");
let load_div = document.getElementById("loading");
let character_div = document.getElementById("characters");
let server_div = document.getElementById("server");
let room_div = document.getElementById("room");

let your_name = null;
let your_character = null;

document.addEventListener("DOMContentLoaded", () => {

    // Read URL param: ?room=xxxx
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromURL = urlParams.get("room");

    if(roomFromURL){
        console.log("Joined via link:", roomFromURL);

        // Hide unwanted things and go to character select
        whoplays_div.style.display = "block";
        load_div.style.display = "none";
        character_div.style.display = "none";

        // Pre-fill join field when join menu appears later
        const codeInput = document.getElementById("code-value");
        if(codeInput){
            codeInput.value = roomFromURL;
        }
    }

});

// Delete all data before to make everything clear
localStorage.clear();

function Update_player() {
       navigator.vibrate(30);
       beep();
       localStorage.setItem("username", your_name);
        load_div.style.display = "block";
    // Clear old interval if exist
    if (delay_load) clearInterval(delay_load)
    delay_load = setInterval(() => {
        count++;
        console.log("Delay: " + count);
        if(count == 5) loadgame();
    
    }, 550);   

}    


function Update_character() {

       if(character.value == null) return;
       if(character.value == "ciko" || character.value ==  "cloe" || character.value == "pici catto") {
              your_character = character.value,  console.log(your_character);
              navigator.vibrate(30);
       }
}

function start() {

        if(player.value == null) return;
        if(player.value == "Toya" || player.value == "Toye") {
                whoplays_div.style.display = "none";
                load_div.style.display = "block";
                your_name = player.value, console.log(your_name);
                Update_player();
                       navigator.vibrate(100);
                       beep();
        }

        else{
                console.log("unknown player" + player);
        }

}

function loadgame(){
        clearInterval(delay_load);
        load_div.style.display = "none";
        document.getElementById("characters").style.display = 'block';
        
}

function accept() {
    let pressed = false;
    if(pressed) return;
  
    if(your_character == null) return;
    else{
        character_div.style.display = "none";
        server_div.style.display = "block";
        beep_start();
        navigator.vibrate(30);
        pressed = true;

        // Auto-join if link was used
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromURL = urlParams.get("room");
        if(roomFromURL){
            document.getElementById("code-value").value = roomFromURL;
            document.getElementById("join-server").click();
        }
    }
}
