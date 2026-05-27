
const ws = new WebSocket(`wss://localhost:3000/pr`);

let nb_round = 0;
let prep_time_limit = 0;
let round_time_limit = 0; 
let round_actuel = 1;
let jeSuisAdminPartie = false; 
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
        
        if (settings_from_back.action == "current pr settings") { 
            nb_round = settings_from_back.donnees.nbp; 
            prep_time_limit = settings_from_back.donnees.prtime; 
            round_time_limit = settings_from_back.donnees.rtime; 
            
            jeSuisAdminPartie = settings_from_back.isAdminPartie;
            console.log("Suis-je l'Admin de cette partie ? :", jeSuisAdminPartie);
            
            gererAffichageBoutonsAdmin();
        }
        
        if (settings_from_back.action === "show_potin") { 
            document.getElementById("titre_guess").innerText = settings_from_back.potin.title; 
            document.getElementById("content_guess").innerText = settings_from_back.potin.content; 
            
           
            const auteurDoc = document.getElementById("auteur_potin");
            if (auteurDoc) {
                auteurDoc.innerText = settings_from_back.potin.UserName || "Quelqu'un";
            }
        }

        if (settings_from_back.action === "change_screen") {
            switch_screen(settings_from_back.screen);
        }
        if (settings_from_back.action === "get_old_tea"){
            const conteneur = document.getElementById("liste_thes_container");
            
            if (settings_from_back.donnees.length === 0){
                console.log("pas de potin")
                return;
            }

            settings_from_back.donnees.forEach(the =>{
                const carte = document.createElement("div");
                carte.className = "carte-the";

                carte.innerHTML = `
                    <h3>${the.title || "Titre inconnu"}</h3>
                    <p><strong>Contenu :</strong> ${the.textContent || the.content || "Aucun contenu"}</p>
                    <small>Balancé par : <span style="color: red;">${the.UserName || the.username || "Anonyme"}</span></small>
                    <hr style="border: 0.5px dashed #ccc; margin-top: 10px;">
                `;
                conteneur.appendChild(carte);
                const ajout = document.createElement("button");
                ajout.innerText ="ajoutez ce potin à la partie"
                ajout.addEventListener("click", () =>{add_old_tea(the);} )
                carte.appendChild(ajout);

            });
        }
    } catch {
        console.warn("Message non-JSON reçu :", event.data);
    }
}

function gererAffichageBoutonsAdmin() {
    const btnConfirmReveal = document.getElementById("btn_confirm_reveal");
    if (btnConfirmReveal) {
        btnConfirmReveal.style.display = jeSuisAdminPartie ? "inline-block" : "none";
    }
}

async function ready() {
    const round = document.getElementById("current_round");
    if (round){round.innerText = round_actuel;} 
    if (jeSuisAdminPartie) {
        ws.send("next_potin");
    }
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

    if(next_screen === 'potin_making'){
        ws.send("send_me_old_tea");
    }
}

function loop(last_screen,results){

    console.log("Round actuel :", round_actuel);
    console.log("Total des rounds prévus (nb_round) :", nb_round);
   
    const maxRounds = parseInt(nb_round, 10) || 3; // conversion en entier parce que ça bug 

    if (round_actuel < maxRounds) {
        round_actuel++;
        
        const roundDoc = document.getElementById("current_round");
        if (roundDoc){roundDoc.innerText = round_actuel;} 
        
        console.log("Passage au round suivant :", round_actuel);
        display_potin(); 
        switch_screen(last_screen);
        if (jeSuisAdminPartie) {
            ws.send("next_potin"); // On demande au serveur de piocher le prochain potin pour TOUT LE MONDE
            ws.send("trigger_next_round_screen"); // On demande au serveur de faire basculer tout le monde sur 'guess'
        }
    } else {
        console.log("Fin du jeu ! Passage aux résultats.");
        switch_screen(results);
    }
}

//  la boucle de jeu doit:
    // - enregistrer le potin dans la base (good)
    // - vider les cases d'inputs (good)
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

function display_potin() {
    ws.send("send_me_old_tea");
}

function add_old_tea(tab){
    try{
        const titre = tab.title;
        const content = tab.textContent;
        console.log(tab);
        fetch('https://localhost:3000/pr_bis', {
        method : 'POST',
        mode : 'cors',
        credentials: 'include',
        headers: {
        'Content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
        "title" : titre , "content": content
        }),
        });

    }catch(error) {
        console.error('Fetch error:', error);
        alert("ajout potin échoué! kim triste");
    }

}