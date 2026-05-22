
const localip = window.location.hostname

let ws =null;
let send_message_button = document.getElementById("send");
const new_message = document.getElementById("new_message");
let refreshInterval = null;
connectWebSocket();

send_message_button.addEventListener("submit", function(event) {
  event.preventDefault();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(new_message.value);
    new_message.value = "";
  } else {
    console.warn("WebSocket pas encore prêt, état:", ws?.readyState);
  }
});

async function connectWebSocket (){
  //pour tester que token tjr valide
  const testRes = await fetch(`https://${localip}:3000/test_cookie`, { credentials: 'include' });
  if (testRes.status === 401) {
    const refreshed = await attemptRefreshToken();
    if (!refreshed) return; 
  }

  ws =  new WebSocket(`wss://localhost:3000/chat`);
  
  ws.onopen = function() {
    console.log('WebSocket connection established.');
    // Vérifier le token un peu après qu'il expire)
    refreshInterval = setInterval(async () => {
      const res = await fetch(`https://${localip}:3000/test_cookie`, { credentials: 'include' });
      if (res.status === 401) {
        console.log("Token expiré, refresh...");
        clearInterval(refreshInterval);
        ws.close();
        await attemptRefreshToken();
      }
    }, 16 * 60);
  };

  ws.onmessage = function(event) {
    console.log(`WebSocket received message: ${event.data}.`);

    if (event.data === "block_temp_for_all"){
      const start_button = document.getElementById("button_start");
      if (start_button){
          start_button.disabled = true;
          start_button.innerText = "une partie est en préparation"
          console.log('button disabled');
      }
    }if(event.data === "all_join_pr"){
      const join_button = document.createElement('button');
      join_button.innerText = "Rejoindre la partie";
      join_button.onclick = function() {
         location.replace("https://localhost:8080/pr.html");
      };      
      const chatbox = document.getElementById('chatbox');
      if (chatbox) {
         chatbox.appendChild(join_button);
         console.log("bouton de join créer");
      }
    }else {
      const message = document.createElement('div');
      message.textContent = event.data;
      document.getElementById('chatbox').appendChild(message);
    }


  };

  ws.onerror = function(error) {
  console.error('WebSocket error:', error);
  };

  ws.onclose = function(event) {
  clearInterval(refreshInterval);
  console.log('WebSocket connection closed:', event);
      if (event.code === 4001 || event.reason === "Token expired" || !event.wasClean) {
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
    const response = await fetch(`https://${localip}:3000/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (response.ok) {
      console.log("Refresh réussi");
      setTimeout(() => connectWebSocket(), 500);
      return true;
    } else {
      console.error("Échec du refresh, redirection login");
      window.location.href = "/login";
      return false;
    }
  } catch (error) {
    console.error("Erreur réseau:", error);
    return false;
  }
}

function start_pr() {

   // envoie au back qu'on cliquer sur le button
   if (ws.readyState === WebSocket.OPEN) {
      ws.send("pr_button_click");
      ws.send("admin_status")
   }
   setTimeout( () => {
      location.replace("https://localhost:8080/pr_settings.html");
   }, 100);
      
}


