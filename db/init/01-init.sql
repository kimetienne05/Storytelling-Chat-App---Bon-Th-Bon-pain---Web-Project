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
(0, 'Souvenir'), (1, 'Love'), (2, 'Ennemies'), 
(3, 'Random'), (4, 'Tragédie'), (5, 'Amies');

CREATE TABLE TeaStatus (
    idTeaStatus INT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);

INSERT INTO TeaStatus (idTeaStatus, name) VALUES 
(0, 'Rumeur'), (1, 'Love'), (2, 'Théorie'), (3, 'Confirmé');

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
INSERT INTO Admin(userName, passwordHash)
VALUES (
    'Kim',
    '$2a$10$Zk4Je37wS.2b88SjFkAOZu/13Vb8R4Q7tCd2oNKW450X0yWThJ5RW'
);

INSERT INTO Admin(userName, passwordHash)
VALUES (
    'Emie',
    '$2a$10$Zk4Je37wS.2b88SjFkAOZu/13Vb8R4Q7tCd2oNKW450X0yWThJ5RW'
);

INSERT INTO Admin(userName, passwordHash)
VALUES (
    'Aanor',
    '$2a$10$Zk4Je37wS.2b88SjFkAOZu/13Vb8R4Q7tCd2oNKW450X0yWThJ5RW'
);