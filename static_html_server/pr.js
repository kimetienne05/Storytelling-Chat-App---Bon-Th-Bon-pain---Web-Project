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

    if(nb_round > val_round ){
        val_round = val_round +1;
        round.innerText = val_round;
        console.log("new round started")
        switch_screen(last_screen);
    }
    else if(nb_round == val_round ){
        switch_screen(results);
        console.log("switch to results")
    }
}

// add potin doit:
    // - enregistrer le potin dans la base
    // - vider les cases d'inputs
    // - créer ou lier les nouveau potin à un espace particulier qui permet de voir les potins selectionné pour la game
    // - doit permettre d'ajouter n'importe quel potin de la base de donnée
    // - (facultatif): quand on parle d'une personne en particulier sans la nommée correctement : on n'ajoute le qualificatif dans la base 
    // et on indique que bidule c'est en fait baptiste
function add_potin(){
    let title = document.getElementById("potin_titre").value
    let story = document.getElementById("potin_contenue").value
    fetch('http://localhost:3000/pr', {
    method : 'POST',
    mode : 'cors',
    credentials: 'include',
    headers: {
    'Content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
    "titre" : username, "post": passwd
    }),
    })
    .then((response) => {
    if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
    
    })
    .then((data) => {
    console.log('New Post created:', data);
    location.replace("http://localhost:8080/index.html");
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    });
    
}