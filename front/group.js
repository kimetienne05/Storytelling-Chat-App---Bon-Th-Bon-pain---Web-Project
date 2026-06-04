const params = new URLSearchParams(globalThis.location.search);
const groupId = params.get("id");
let allUsers = [];
const ws = new WebSocket("wss://localhost:3000/chat");
const gws = new WebSocket("wss://localhost:3000/start_pr");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type !== "chat:message") return;

  if (data.groupId != groupId) return;

  const chatBox = document.getElementById("chatMessages");

  const div = document.createElement("div");

  div.className = "chatMessage";

  div.textContent = `${data.username} : ${data.message}`;

  chatBox.appendChild(div);

  chatBox.scrollTop = chatBox.scrollHeight;
};

gws.onmessage = function (event) {
  try {
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
    } else {
      const message = document.createElement("div");
      message.textContent = event.data;
      document.getElementById("chatbox").appendChild(message);
    }
  } catch {
    console.error("Erreur réseau:", error);
    return false;
  }
};
async function loadGroup() {
  const response = await fetch("https://localhost:3000/groups", {
    credentials: "include",
  });

  const groups = await response.json();

  const group = groups.find((g) => g.idGroup == groupId);

  if (group) {
    document.getElementById("groupTitle").textContent = group.groupName;
  }
}

loadGroup();

function _Accueil() {
  globalThis.location.href = "accueil.html";
}
function _CreePopup() {
  console.log("popup ouvert");
  document.getElementById("popup").style.display = "block";
  LoadUsers();
}
async function LoadUsers() {
  const response = await fetch(
    `https://localhost:3000/group/usersnotin/${groupId}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  allUsers = await response.json();

  DisplayUsers(allUsers);
}
function FermerPopup() {
  document.getElementById("popup").style.display = "none";
}
async function _InviteUsers() {
  const checkedUsers = document.querySelectorAll("#userList input:checked");

  const invitedUsers = [];

  checkedUsers.forEach((u) => {
    invitedUsers.push(u.value);
  });

  await fetch("https://localhost:3000/invite", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId: groupId,
      users: invitedUsers,
    }),
  });

  FermerPopup();
}

function DisplayUsers(users) {
  const userList = document.getElementById("userList");

  userList.innerHTML = "";

  for (let i = 0; i < users.length; i++) {
    const div = document.createElement("div");

    div.className = "userItem";

    div.innerHTML = `
            <input type="checkbox" value="${users[i].idUser}">
            ${users[i].userName}
        `;

    userList.appendChild(div);
  }
}

function _FilterUsers() {
  const search = document
    .getElementById("searchUser")
    .value
    .toLowerCase();

  const filtered = allUsers.filter((user) =>
    user.userName.toLowerCase().includes(search)
  );

  DisplayUsers(filtered);
}
async function LoadMembers() {
  const params = new URLSearchParams(globalThis.location.search);
  const groupId = params.get("id");

  const response = await fetch(
    `https://localhost:3000/group/members/${groupId}`,
    { credentials: "include" },
  );

  const members = await response.json();

  const container = document.getElementById("memberList");

  container.innerHTML = "";

  for (const m of members) {
    const div = document.createElement("div");
    div.textContent = m.userName;

    container.appendChild(div);
  }
}
async function _QuitGroup() {
  await fetch("https://localhost:3000/group/leave", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idGroup: groupId,
    }),
  });

  globalThis.location.href = "accueil.html";
}
function _SendMessage() {
  const input = document.getElementById("chatInput");

  const message = input.value;

  if (!message) return;

  ws.send(JSON.stringify({
    type: "chat:message",
    groupId: groupId,
    message: message,
  }));

  input.value = "";
}
async function LoadMessages() {
  const response = await fetch(
    `https://localhost:3000/messages/${groupId}`,
    {
      credentials: "include",
    },
  );

  const messages = await response.json();

  const chatBox = document.getElementById("chatMessages");

  chatBox.innerHTML = "";

  for (const msg of messages) {
    const div = document.createElement("div");

    div.className = "chatMessage";

    div.textContent = `${msg.userName} : ${msg.content}`;

    chatBox.appendChild(div);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
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

LoadMessages();
LoadUsers();
loadGroup();
LoadMembers();
