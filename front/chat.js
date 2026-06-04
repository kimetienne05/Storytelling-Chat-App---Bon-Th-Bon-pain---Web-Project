let ws = null;
const send_message_button = document.getElementById("send");
const new_message = document.getElementById("new_message");
let refreshInterval = null;
connectWebSocket();

send_message_button.addEventListener("submit", function (event) {
  event.preventDefault();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(new_message.value);
    new_message.value = "";
  } else {
    console.warn("WebSocket pas encore prêt, état:", ws?.readyState);
  }
});

async function connectWebSocket() {
  //pour tester que token tjr valide
  const testRes = await fetch(`https://localhost:3000/test_cookie`, {
    credentials: "include",
  });
  if (testRes.status === 401) {
    const refreshed = await attemptRefreshToken();
    if (!refreshed) return;
  }

  ws = new WebSocket(`wss:///localhost:3000/chat`);

  ws.onopen = function () {
    console.log("WebSocket connection established.");
    // Vérifier le token un peu après qu'il expire)
    refreshInterval = setInterval(async () => {
      const res = await fetch(`https://localhost:3000/test_cookie`, {
        credentials: "include",
      });
      if (res.status === 401) {
        console.log("Token expiré, refresh...");
        clearInterval(refreshInterval);
        ws.close();
        await attemptRefreshToken();
      }
    }, 16 * 60);
  };

  ws.onmessage = function (event) {
    console.log(`WebSocket received message: ${event.data}.`);

    if (event.data === "block_temp_for_all") {
      const start_button = document.getElementById("button_start");
      if (start_button) {
        // start_button.disabled = true;
        // start_button.innerText = "une partie est en préparation"
        start_button.style.pointerEvents = "none"; // désactive le clic
        start_button.style.opacity = "0.4"; // feedback visuel
        start_button.title = "Une partie est en préparation"; // tooltip
      }
    }
    if (event.data === "all_join_pr") {
      const join_button = document.createElement("button");
      join_button.innerText = "Rejoindre la partie";
      join_button.onclick = function () {
        location.replace("https://localhost:8080/pr.html");
      };
      const chatbox = document.getElementById("chatbox");
      if (chatbox) {
        chatbox.appendChild(join_button);
        console.log("bouton de join créer");
      }
    } else {
      const message = document.createElement("div");
      message.textContent = event.data;
      document.getElementById("chatbox").appendChild(message);
    }
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };

  ws.onclose = function (event) {
    clearInterval(refreshInterval);
    console.log("WebSocket connection closed:", event);
    if (
      event.code === 4001 || event.reason === "Token expired" || !event.wasClean
    ) {
      console.log("Token expiré. Tentative de refresh");
      if (!event.wasClean) {
        attemptRefreshToken();
      }
    } else {
      console.log("Fermeture normale ou erreur non liée au token.");
    }
  };
}

async function attemptRefreshToken() {
  try {
    const response = await fetch(`https://localhost:3000/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      console.log("Refresh réussi");
      setTimeout(() => connectWebSocket(), 500);
      return true;
    } else {
      console.error("Échec du refresh, redirection login");
      globalThis.location.href = "/login";
      return false;
    }
  } catch (error) {
    console.error("Erreur réseau:", error);
    return false;
  }
}

function _start_pr() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send("pr_button_click");

    console.log("Envoi de start_pr réussi, préparation de la redirection...");

    ws.onclose = null;

    setTimeout(() => {
      ws.close(); // Ferme proprement
      location.replace(`https://localhost:8080/pr_settings.html`);
    }, 200);
  } else {
    console.warn("Le WebSocket n'est pas connecté. Redirection directe.");
    location.replace(`https://localhost:8080/pr_settings.html`);
  }
}
