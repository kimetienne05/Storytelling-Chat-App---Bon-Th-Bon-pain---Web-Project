let allUsers = [];

async function LoadUsers(){

    const response = await fetch("https://localhost:3000/users", {

        method: "GET",

        credentials: "include"

    });

    allUsers = await response.json();

    DisplayUsers(allUsers);
}
function FermerPopup(){

    document.getElementById("popup").style.display = "none";

}

function CreeGroup(){

    document.getElementById("popup").style.display = "block";

}
async function AddGroup(){

    let nom = document.getElementById("nomGroupe").value;

    let checkedUsers = document.querySelectorAll(
        "#userList input:checked"
    );

    let invitedUsers = [];

    checkedUsers.forEach(user => {

        invitedUsers.push(user.value);

    });

    const response = await fetch(
        "https://localhost:3000/addgroup",
        {

            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                nom: nom,

                users: invitedUsers

            })

        }
    );

    const data = await response.json();

    console.log(data);

    // AJOUT DIRECT DU BOUTON
    let bouton = document.createElement("button");

    bouton.textContent = nom;

    bouton.onclick = function(){

        alert("Tu as cliqué sur " + nom);

    };

    document.querySelector(".groupe").appendChild(bouton);

    // fermer popup
    document.getElementById("popup").style.display = "none";
}

async function LoadGroups(){

    const response = await fetch("https://localhost:3000/groups", {

        method: "GET",

        credentials: "include"

    });

    const groups = await response.json();

    for(let i = 0; i < groups.length; i++){

        let bouton = document.createElement("button");

        bouton.textContent = groups[i].groupName;

        bouton.onclick = function(){

            alert(groups[i].groupName);

        };

        document.querySelector(".groupe").appendChild(bouton);
    }
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

async function LoadInvitations(){

    const response = await fetch(
        "https://localhost:3000/invitations",
        {

            method: "GET",

            credentials: "include"

        }
    );

    const invitations = await response.json();

    let left = document.querySelector(".left");

    for(let i = 0; i < invitations.length; i++){

        let div = document.createElement("div");

        div.innerHTML = `

            <p>${invitations[i].groupName}</p>

            <button onclick="HandleInvitation(${invitations[i].idGroup}, 'accept')">
                Accepter
            </button>

            <button onclick="HandleInvitation(${invitations[i].idGroup}, 'refuse')">
                Refuser
            </button>

            <hr>
        `;

        left.appendChild(div);
    }
}
async function HandleInvitation(idGroup, action){

    await fetch(
        "https://localhost:3000/invitation",
        {

            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                idGroup: idGroup,

                action: action

            })
        }
    );

    location.reload();
}

async function Logout(){

    await fetch(
        "https://localhost:3000/logout",
        {
            method: "POST",
            credentials: "include"
        }
    );

    window.location.href = "login.html";
}

LoadGroups();
LoadInvitations();
LoadUsers();

// refresh automatique invitations
setInterval(() => {

    document.querySelector(".left").innerHTML =
        "<h2>Invitation</h2>";

    LoadInvitations();

}, 3000);

// refresh automatique groupes
setInterval(() => {

    document.querySelector(".groupe").innerHTML =
        "<h2>Liste des groupes</h2>";

    LoadGroups();

}, 3000);