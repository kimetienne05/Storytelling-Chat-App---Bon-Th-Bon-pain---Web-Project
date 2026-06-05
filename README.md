# BonTheBonPain - Installation et démarrage

## Prérequis

- Git
- Docker Desktop ou Docker Engine + Docker Compose
- OpenSSL

---

## 1. Cloner le projet

```bash
git clone <url-du-projet>
```
En raison d'un oubli de clic sur le bouton MERGE avant 8h, la version finale du site est sur la branche Potin_roulette. 
> Nous nous excusons de cet oubli.
```bash
git switch Potin_roulette
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

### Identifiants administrateur mit automatiquement dans la base pour les tests

Aanor ou Kim ou Emie et mdp:admin

## 5. Accéder à l'application

Ouvrir un navigateur et accéder à :

```text
https://localhost:8080
```

> Le navigateur affichera probablement un avertissement de sécurité lié au
> certificat SSL auto-signé. Il est normal de l'accepter pour un environnement
> de développement.
