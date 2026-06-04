let allUsers = [];
let groups = [];

async function LoadUsers() {
  const response = await fetch("https://localhost:3000/users", {
    method: "GET",

    credentials: "include",
  });

  allUsers = await response.json();

  DisplayUsers(allUsers);
}
function _FermerPopup() {
  document.getElementById("popup").style.display = "none";
}

function _CreeGroup() {
  document.getElementById("popup").style.display = "block";
}
async function _AddGroup() {
  const nom = document.getElementById("nomGroupe").value;

  const checkedUsers = document.querySelectorAll(
    "#userList input:checked",
  );

  const invitedUsers = [];

  checkedUsers.forEach((user) => {
    invitedUsers.push(user.value);
  });

  const response = await fetch(
    "https://localhost:3000/addgroup",
    {
      method: "POST",

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        nom: nom,

        users: invitedUsers,
      }),
    },
  );

  const data = await response.json();

  console.log(data);

  // AJOUT DIRECT DU BOUTON
  const bouton = document.createElement("button");

  bouton.textContent = nom;

  bouton.onclick = function () {
    globalThis.location.href = "group.html?id=" + data.idGroup + "&name=" +
      data.groupName;
  };

  document.getElementById("groupList").appendChild(bouton);

  // fermer popup
  document.getElementById("popup").style.display = "none";
  LoadGroups();
}
async function LoadGroups() {
  try {
    const response = await fetch("https://localhost:3000/groups", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.log("Erreur :", response.status);
      return;
    }

    groups = await response.json();

    const container = document.getElementById("groupList");

    if (!container) {
      console.log("groupList introuvable");
      return;
    }

    container.innerHTML = "";

    for (let i = 0; i < groups.length; i++) {
      const bouton = document.createElement("button");

      bouton.textContent = groups[i].groupName;

      bouton.onclick = function () {
        globalThis.location.href = "group.html?id=" + groups[i].idGroup;
      };

      container.appendChild(bouton);
    }
  } catch (error) {
    console.log("Erreur LoadGroups :", error);
  }
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
async function LoadInvitations() {
  const response = await fetch(
    "https://localhost:3000/invitations",
    {
      credentials: "include",
    },
  );

  const invitations = await response.json();

  const container = document.getElementById("invitationList");

  container.innerHTML = "";

  for (let i = 0; i < invitations.length; i++) {
    const div = document.createElement("div");

    div.innerHTML = `
            <p>${invitations[i].groupName}</p>

            <button onclick="_HandleInvitation(${
      invitations[i].idGroup
    }, 'accept')">
                Accepter
            </button>

            <button onclick="_HandleInvitation(${
      invitations[i].idGroup
    }, 'refuse')">
                Refuser
            </button>

            <hr>
        `;

    container.appendChild(div);
  }
}
async function _HandleInvitation(idGroup, action) {
  await fetch(
    "https://localhost:3000/invitation",
    {
      method: "POST",

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        idGroup: idGroup,

        action: action,
      }),
    },
  );

  location.reload();
}

async function _Logout() {
  await fetch(
    "https://localhost:3000/logout",
    {
      method: "POST",
      credentials: "include",
    },
  );

  globalThis.location.href = "login.html";
}

globalThis.onload = () => {
  LoadGroups();
  LoadUsers();

  LoadInvitations(); // première charge

  setInterval(() => {
    LoadInvitations();
  }, 3000); // toutes les 3 secondes
};
