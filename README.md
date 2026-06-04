# BonTheBonPain - Installation et démarrage

## Prérequis

* Git
* Docker Desktop ou Docker Engine + Docker Compose
* OpenSSL

---

## 1. Cloner le projet

```bash
git clone <url-du-projet>
```
Se placer à la racine du projet :
```bash
cd bonthebonpain
```

Créer le fichier `.env` :

```bash
touch .env
```

Remplir le fichier `.env` en vous basant sur le fichier `envExemple`.

---

## 2. Configuration du Frontend

Se placer dans le dossier du front :

```bash
cd front
```
Générer les certificats SSL :

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

Revenir à la racine du projet :

```bash
cd ..
```

---

## 3. Configuration du Backend

Se placer dans le dossier du back :

```bash
cd back
```

Générer les certificats SSL :

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

Revenir à la racine du projet :

```bash
cd ..
```

---

## 4. Démarrage des conteneurs

Démarrer Docker Desktop (ou vérifier que Docker Engine est lancé).

Construire et démarrer les conteneurs :

```bash
docker compose down
docker compose up -d --build
```

---

## 5. Initialisation de la base de données

Accéder au conteneur MariaDB :

```bash
docker exec -it dbBtbp sh
```

Se connecter à MariaDB :

```bash
mariadb -u root -p
```

Entrer le mot de passe défini dans le fichier `.env`.

Sélectionner la base :

```sql
USE btbp;
```

---

## 6. Création du schéma de base de données

Exécuter les requêtes SQL suivantes :

```sql
CREATE TABLE Admin (
    idAdmin INT PRIMARY KEY AUTO_INCREMENT,
    userName VARCHAR(30) NOT NULL,
    passwordHash VARCHAR(1024) NOT NULL,
    refreshToken VARCHAR(1024),
    accessToken VARCHAR(1024)
);

CREATE TABLE User (
    idUser INT PRIMARY KEY AUTO_INCREMENT,
    userName VARCHAR(30) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(1024),
    accessToken VARCHAR(1024)
);

ALTER TABLE User
ADD UNIQUE (userName);

CREATE TABLE Groups (
    idGroup INT PRIMARY KEY AUTO_INCREMENT,
    groupName VARCHAR(30) NOT NULL,
    groupOwner INT,
    FOREIGN KEY (groupOwner) REFERENCES User(idUser)
);

CREATE TABLE Baguette (
    idBaguette INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL
);

CREATE TABLE TeaType (
    idTeaType INT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);

INSERT INTO TeaType (idTeaType, name) VALUES
(0, 'Souvenir'),
(1, 'Love'),
(2, 'Ennemies'),
(3, 'Random'),
(4, 'Tragédie'),
(5, 'Amies');

CREATE TABLE TeaStatus (
    idTeaStatus INT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);

INSERT INTO TeaStatus (idTeaStatus, name) VALUES
(0, 'Rumeur'),
(1, 'Love'),
(2, 'Théorie'),
(3, 'Confirmé');

CREATE TABLE Tea (
    idTea INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(30) NOT NULL,
    creator INT NOT NULL,
    fromGroup INT,
    textContent TEXT,
    type INT NOT NULL,
    postDate DATE,
    eventDate DATE,
    anonymous BOOLEAN,
    status INT NOT NULL,
    FOREIGN KEY (creator) REFERENCES User(idUser),
    FOREIGN KEY (fromGroup) REFERENCES Groups(idGroup),
    FOREIGN KEY (type) REFERENCES TeaType(idTeaType),
    FOREIGN KEY (status) REFERENCES TeaStatus(idTeaStatus)
);

CREATE TABLE UserGroup (
    idUser INT NOT NULL,
    idGroup INT NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    PRIMARY KEY (idUser, idGroup),
    FOREIGN KEY (idUser) REFERENCES User(idUser),
    FOREIGN KEY (idGroup) REFERENCES Groups(idGroup)
);

CREATE TABLE BagGroup (
    idBaguette INT NOT NULL,
    idGroup INT NOT NULL,
    PRIMARY KEY (idBaguette, idGroup),
    FOREIGN KEY (idBaguette) REFERENCES Baguette(idBaguette),
    FOREIGN KEY (idGroup) REFERENCES Groups(idGroup)
);

CREATE TABLE BagTea (
    idBaguette INT NOT NULL,
    idTea INT NOT NULL,
    PRIMARY KEY (idBaguette, idTea),
    FOREIGN KEY (idBaguette) REFERENCES Baguette(idBaguette),
    FOREIGN KEY (idTea) REFERENCES Tea(idTea)
);

CREATE TABLE PotinsPartie (
    idPotin INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    content VARCHAR(500) NOT NULL,
    truthValue BOOLEAN NOT NULL,
    isNew BOOLEAN NOT NULL,
    postDate DATE,
    eventDate DATE,
    UserName VARCHAR(30) NOT NULL,
    idUser INT NOT NULL,
    idGroup INT NOT NULL,

    CONSTRAINT fk_potin_username
        FOREIGN KEY (UserName)
        REFERENCES User(userName)
        ON DELETE CASCADE,

    CONSTRAINT fk_potin_userid
        FOREIGN KEY (idUser)
        REFERENCES User(idUser)
        ON DELETE CASCADE,

    CONSTRAINT fk_potin_group
        FOREIGN KEY (idGroup)
        REFERENCES Groups(idGroup)
        ON DELETE CASCADE
);

CREATE TABLE Message (
    idMessage INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    sendDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    idUser INT NOT NULL,
    idGroup INT NOT NULL,
    FOREIGN KEY (idUser) REFERENCES User(idUser),
    FOREIGN KEY (idGroup) REFERENCES Groups(idGroup)
);
```

---

## 7. Création du compte administrateur

Exécuter la requête suivante :

```sql
INSERT INTO Admin(userName, passwordHash)
VALUES (
    'admin',
    '$2a$10$Zk4Je37wS.2b88SjFkAOZu/13Vb8R4Q7tCd2oNKW450X0yWThJ5RW'
);
```

### Identifiants administrateur

* Nom d'utilisateur : `admin`
* Mot de passe : `admin`

---

## 8. Quitter MariaDB et le conteneur

Quitter MariaDB :

```bash
exit
```

Quitter le conteneur :

```bash
exit
```

---

## 9. Redémarrer l'application

```bash
docker compose down
docker compose up -d --build
```

---

## 10. Accéder à l'application

Ouvrir un navigateur et accéder à :

```text
https://localhost:8080
```

> Le navigateur affichera probablement un avertissement de sécurité lié au certificat SSL auto-signé. Il est normal de l'accepter pour un environnement de développement.
