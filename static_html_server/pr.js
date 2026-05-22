
const ws = new WebSocket(`wss://localhost:3000/pr`);

let nb_round = 0;
let prep_time_limit = 0;
let round_time_limit = 0; 
let round_actuel = 1;
ws.onopen = function (){
    console.log("new player joined");
    ws.send("add_new_player");
}
ws.onmessage = function(event){
    if (event.data == "plus one"){
        const player = document.getElementById("player_connected");
        if (player){
            let players = parseInt(player.innerText, 10);
            players = players + 1;
            player.innerText = players;
        }
        return; 
    }

    try {
        const settings_from_back = JSON.parse(event.data);
        if (settings_from_back.action == "current pr settings"){
            nb_round = settings_from_back.donnees.nbp;
            prep_time_limit = settings_from_back.donnees.prtime;
            round_time_limit = settings_from_back.donnees.rtime;
        }
    } catch {
        console.warn("Message non-JSON reçu :", event.data);
    }
}

async function ready(){
    await recup_potin();
    const round = document.getElementById("current_round");
    if (round) round.innerText = round_actuel;
    switch_screen('guess');
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

    if(next_screen === 'guess'){
        display_potin();
    }
}

function loop(last_screen,results){

    console.log("Round actuel :", round_actuel);
    console.log("Total des rounds prévus (nb_round) :", nb_round);

   
    const maxRounds = parseInt(nb_round, 10) || 3; // conversion en entier parce que ça bug 

    if (round_actuel < maxRounds) {
        round_actuel++;
        
        const roundDoc = document.getElementById("current_round");
        if (roundDoc) roundDoc.innerText = round_actuel;
        
        console.log("Passage au round suivant :", round_actuel);
        display_potin(); 
        switch_screen(last_screen);
    } else {
        console.log("Fin du jeu ! Passage aux résultats.");
        switch_screen(results);
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
    // recupérationdes variables
    let title = document.getElementById("potin_titre").value
    let story = document.getElementById("potin_contenue").value
    let vrai = false;
    if (document.getElementById("potin_vrai").checked){
        vrai = true;
    }

    fetch('https://localhost:3000/pr', {
    method : 'POST',
    mode : 'cors',
    credentials: 'include',
    headers: {
    'Content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
    "title" : title, "content": story, "truthValue": vrai
    }),
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    alert("ajout potin échoué!");
    });

    // on remet à blanc
    document.getElementById("potin_titre").value=""
    document.getElementById("potin_contenue").value=""
    document.getElementById("potin_vrai").checked=false
    document.getElementById("potin_faux").checked=false
}

let liste_potin = []
let liste_potin_restant =[]

async function recup_potin() {
    try {
        // Changement de méthode vers GET pour correspondre au Back
        const response = await fetch('https://localhost:3000/gestion_potin', {
            method: 'GET', 
            mode: 'cors',
            credentials: 'include',
        });

        console.log("Status reçu :", response.status);

        if (!response.ok) {

            const err = await response.json();
            console.error("Erreur du serveur :", err.error);
            return;
        }
        liste_potin = await response.json();  

        console.log("Type de données reçues :", typeof liste_potin, "Est-ce un tableau ?", Array.isArray(liste_potin));
        console.log("Contenu brut reçu du serveur :", liste_potin);

        liste_potin_restant = [...liste_potin];

    } catch (error) {
        console.error("Erreur réseau ou parsing lors de recup_potin :", error);
    }
}

function draw_potin(){
    console.log("taille actuelle",liste_potin_restant.length);
    if (liste_potin_restant.length == 0){
        alert("la partie devrait être fini");
        return null
    }
    const i = Math.floor(Math.random()*liste_potin_restant.length);
    const potin_extrait = liste_potin_restant.splice(i,1)[0];
    console.log("taille post draw",liste_potin_restant.length);
    return potin_extrait;
}

function display_potin(){
    const title_potin = document.getElementById("titre_guess");
    title_potin.innerText = draw_potin().title; 
    
}