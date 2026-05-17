const ws = new WebSocket(`ws://localhost:3000/pr`);

let nb_round = 0;
let prep_time_limit = 0;
let round_time_limit = 0; 

ws.onopen = function (){
    console.log("new player joined");
    ws.send("add_new_player");
}
ws.onmessage = function(event){

    console.log(`WebSocket received message: ${event.data}.`);

    if (event.data == "plus one"){
        const player = document.getElementById("player_connected");
        if (player){
            let players = parseInt(player.innerText,10);
            players = players + 1;
            player.innerText = players;
            console.log("player was added")
        }     
    }
    const settings_from_back = JSON.parse(event.data);
    if (settings_from_back.action == "current pr settings"){
        nb_round = settings_from_back.donnees.nbp;
        console.log("val nb round recup", nb_round);
        prep_time_limit = settings_from_back.donnees.prtime;
        round_time_limit = settings_from_back.donnees.rtime;

        console.log("maj var global")
    }
}
function switch_screen(next_screen){
    const game_screens = document.querySelectorAll('.pr');
    
    game_screens.forEach(function(pr){
        pr.style.display = 'none';
    });

    const display_screen = document.getElementById(next_screen);
    if (display_screen){
        display_screen.style.display = 'block';
        console.log('switch successfull');
    }

}

function loop(last_screen,results){
    let round = document.getElementById("current_round")
    let val_round = parseInt(round.innerText,10);

    console.log(val_round);
    console.log(nb_round);

    if(nb_round + 1 > val_round ){
        val_round = val_round +1;
        round.innerText = val_round;
        console.log("new round started")
        switch_screen(last_screen);
    }
    else if(nb_round + 1 == val_round ){
        switch_screen(results);
        console.log("switch to results")
    }
}