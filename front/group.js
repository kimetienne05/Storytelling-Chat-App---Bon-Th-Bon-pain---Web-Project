const params = new URLSearchParams(window.location.search);
const groupId = params.get("id");
let allUsers = [];
const ws = new WebSocket("wss://localhost:3000/chat");
ws.onmessage = (event) => {

    const data = JSON.parse(event.data);

    if (data.type !== "chat:message") return;

    if (data.groupId != groupId) return;

    const chatBox = document.getElementById("chatMessages");

    const div = document.createElement("div");

    div.className = "chatMessage";

    div.textContent =
        `${data.username} : ${data.message}`;

    chatBox.appendChild(div);

    chatBox.scrollTop = chatBox.scrollHeight;
};
async function loadGroup(){

    const response = await fetch("https://localhost:3000/groups", {
        credentials: "include"
    });

    const groups = await response.json();

    const group = groups.find(g => g.idGroup == groupId);

    if(group){
        document.getElementById("groupTitle").textContent = group.groupName;
    }
}

loadGroup();

async function Accueil(){
    window.location.href = "accueil.html";
}
function CreePopup(){
    console.log("popup ouvert");
    document.getElementById("popup").style.display = "block";
    LoadUsers();
}
async function LoadUsers(){

    const response = await fetch(
        `https://localhost:3000/group/usersnotin/${groupId}`,
        {
            method: "GET",
            credentials: "include"
        }
    );

    allUsers = await response.json();

    DisplayUsers(allUsers);
}
function FermerPopup(){

    document.getElementById("popup").style.display = "none";

}
async function InviteUsers() {

    let checkedUsers = document.querySelectorAll("#userList input:checked");

    let invitedUsers = [];

    checkedUsers.forEach(u => {
        invitedUsers.push(u.value);
    });

    await fetch("https://localhost:3000/invite", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            groupId: groupId,
            users: invitedUsers
        })
    });

    FermerPopup();
}

function DisplayUsers(users){

    let userList = document.getElementById("userList");

    userList.innerHTML = "";

    for(let i = 0; i < users.length; i++){

        let div = document.createElement("div");

        div.className = "userItem";

        div.innerHTML = `
            <input type="checkbox" value="${users[i].idUser}">
            ${users[i].userName}
        `;

        userList.appendChild(div);
    }
}

function FilterUsers(){

    let search = document
        .getElementById("searchUser")
        .value
        .toLowerCase();

    let filtered = allUsers.filter(user =>
        user.userName.toLowerCase().includes(search)
    );

    DisplayUsers(filtered);
}
async function LoadMembers(){

    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("id");

    const response = await fetch(
        `https://localhost:3000/group/members/${groupId}`,
        { credentials: "include" }
    );

    const members = await response.json();

    const container = document.getElementById("memberList");

    container.innerHTML = "";

    for(let m of members){

        let div = document.createElement("div");
        div.textContent = m.userName;

        container.appendChild(div);
    }
}
async function QuitGroup(){

    await fetch("https://localhost:3000/group/leave", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            idGroup: groupId
        })
    });

    window.location.href = "accueil.html";
}
function SendMessage() {

    const input = document.getElementById("chatInput");

    const message = input.value;

    if (!message) return;

    ws.send(JSON.stringify({
        type: "chat:message",
        groupId: groupId,
        message: message
    }));

    input.value = "";
}
async function LoadMessages() {

    const response = await fetch(
        `https://localhost:3000/messages/${groupId}`,
        {
            credentials: "include"
        }
    );

    const messages = await response.json();

    const chatBox = document.getElementById("chatMessages");

    chatBox.innerHTML = "";

    for (const msg of messages) {

        const div = document.createElement("div");

        div.className = "chatMessage";

        div.textContent =
            `${msg.userName} : ${msg.content}`;

        chatBox.appendChild(div);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}
LoadMessages();
LoadUsers();
loadGroup();
LoadMembers();