const ws_chat = new WebSocket(`wss://localhost:3000/start_pr`);

function _go_to_game() {
  const sendJoin = () => {
    if (ws_chat.readyState === WebSocket.OPEN) {
      ws_chat.send("join_allowed");

      // On désactive le onclose pour éviter les sur-déclenchements de logs
      ws_chat.onclose = null;

      // On attend un court instant pour s'assurer que le paquet réseau a quitté le navigateur
      setTimeout(() => {
        ws_chat.close();
        location.replace("https://localhost:8080/pr.html");
      }, 200);
    }
  };

  if (ws_chat.readyState === WebSocket.OPEN) {
    sendJoin();
  } else {
    ws_chat.addEventListener("open", sendJoin, { once: true });
  }
}

function _settings_done(e) {
  e.preventDefault();
  const nb_potin = document.getElementById("nb_potin").value;
  const prep_time_game = document.getElementById("prep_time").value;
  const round_time = document.getElementById("round_time").value;

  fetch("https://localhost:3000/settings", {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      "nbp": nb_potin,
      "prtime": prep_time_game,
      "rtime": round_time,
    }),
  })
    .catch((error) => {
      console.error("Fetch error:", error);
    });

  if (ws_chat.readyState === WebSocket.OPEN) {
    ws_chat.send("join_allowed");
  }
}
