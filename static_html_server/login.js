function searchUser(isadmin) { 
    let username = document.getElementById("Nom").value
    let passwd = document.getElementById("Mdp").value
    fetch('https://localhost:3000/login', {
    method : 'POST',
    mode : 'cors',
    credentials: 'include',
    headers: {
    'Content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
    "name" : username, "passwd": passwd, "isadmin": isadmin
    }),
    })
    .then((response) => {
    if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
    
    })
    .then((data) => {
    console.log('New Post created:', data);
    location.replace("https://localhost:8080/index.html");
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    }); 
}


function testCookie(){
    fetch('https://localhost:3000/test_cookie', {
    method : 'GET',
    mode : 'cors',
    credentials: 'include',
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
    console.log('New Post created:', data);
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    });
}


function inscription(){
    let username = document.getElementById("Nom").value
    let passwd = document.getElementById("Mdp").value
    fetch('https://localhost:3000/inscription', {
    method : 'POST',
    mode : 'cors',
    credentials: 'include',
    headers: {
    'Content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
    "name" : username, "passwd": passwd
    }),
    })
    .then((response) => {
    if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
    
    })
    .then((data) => {
    console.log('New Post created:', data);
    alert("Inscription réussi!");
    location.replace("https://localhost:8080/index.html");
    })
    .catch((error) => {
    console.error('Fetch error:', error);
    alert("Inscription échoué!");
    });
}