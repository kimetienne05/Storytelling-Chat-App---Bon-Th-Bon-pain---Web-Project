
const localip = window.location.hostname

const ws = new WebSocket(`ws://localhost:3000/chat`);
let send_message_button = document.getElementById("send");
let new_message = document.getElementById("new_message");

send_message_button.addEventListener("submit", function(event) {
 event.preventDefault(); // Prevent default form submission
 // Send
 ws.send(new_message.value);
 new_message.value = ""
 });
 
 ws.onopen = function() {
 console.log('WebSocket connection established.');
 };

 ws.onmessage = function(event) {
 console.log(`WebSocket received message: ${event.data}.`);
// bon c'est buggé c'est pas grave
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
         location.replace("http://localhost:8080/pr.html")
      };
      const chatbox = document.getElementById('chatbox');
      if (chatbox) {
         chatbox.appendChild(join_button);
         console.log("bouton de join créer");
      }
   }else{
      const message = document.createElement('div');
      message.textContent = event.data;
      document.getElementById('chatbox').appendChild(message);
      console.log('ajout au chat')
   }

 };
 ws.onerror = function(error) {
   console.error('WebSocket error:', error);
 };

 ws.onclose = function(event) {
 console.log('WebSocket connection closed:', event);
 };

function start_pr() { 
   // envoie au back qu'on cliquer sur le button
   if (ws.readyState === WebSocket.OPEN) {
      ws.send("pr_button_click");
   }
    
   setTimeout( () => {
      location.replace("http://localhost:8080/pr_settings.html");
   }, 100);
      
}
