const ws = new WebSocket(`ws://localhost:3000/settings`);
const ws_chat = new WebSocket(`ws://localhost:3000/chat`);

function go_to_game(){
   setTimeout( () => {
      location.replace("http://localhost:8080/pr.html");
   }, 100);
}
function settings_done(){
    let nb_potin = document.getElementById("nb_potin").value
    let prep_time_game = document.getElementById("prep_time").value
    let round_time = document.getElementById("round_time").value

    fetch('http://localhost:3000/settings', {
    method : 'POST',
    mode : 'cors',
    credentials: 'include',
    headers: {
    'Content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
    "nbp" : nb_potin, "prtime": prep_time_game, "rtime": round_time
    }),
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    });

    if (ws_chat.readyState === WebSocket.OPEN){
        ws_chat.send("join_allowed");
    }
}
