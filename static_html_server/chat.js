const localip = window.location.hostname

const ws = new WebSocket(`wss://localhost:3000/chat`);
let send_message_button = document.getElementById("send");



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
 const message = document.createElement('div');
    message.textContent = event.data;
    document.getElementById('chatbox').appendChild(message);

 };

 ws.onerror = function(error) {
 console.error('WebSocket error:', error);
 };

 ws.onclose = function(event) {
 console.log('WebSocket connection closed:', event);
 };