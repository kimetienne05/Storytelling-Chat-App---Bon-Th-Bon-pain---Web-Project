import { Application, Router, Context } from "https://deno.land/x/oak@v17.1.6/mod.ts"
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
import { resolve } from "node:path";

const router = new Router();
const app = new Application();
const clients = new Set();

//pepper:
const PEPPER = Deno.env.get("PASSWORD_PEPPER");
if (!PEPPER) throw new Error("PASSWORD_PEPPER env var is not set");

const SALT_ROUNDS = 12;

//pour tokens:
export const ACCESS_TOKEN_EXPIRES_IN = 60*15; // 15 minutes in seconds
export const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

//sql

const db = await new Client().connect({
  hostname: Deno.env.get("MYSQL_HOST") || "localhost",
  port: Number(Deno.env.get("MYSQL_PORT") || "3306"),
  username: Deno.env.get("MYSQL_USER") || "root",
  password: Deno.env.get("MYSQL_PASSWORD") || "",
  db: Deno.env.get("MYSQL_DATABASE") || "test",
});

const { rows: data } = await db.execute("SELECT * FROM User");
//console.log(await db.execute("SELECT VERSION() AS version"));


// fonctions

async function get_hash(password: string): Promise<string> {
 const saltRounds = 10;
 const peppered = password + PEPPER;
 const salt = await bcrypt.genSalt(saltRounds); 
 return await bcrypt.hash(peppered, salt); 
}

function removeTokenByUser(user: string) {
   for (const token in tokens) {
   if (tokens[token] === user) {
   delete tokens[token];
   break;
   }
   }
}


const tokens: { [key: string]: string } = {};

//clé secrete
const hexKey = Deno.env.get("SECRET");
if (!hexKey) {
  throw new Error("manque secretkey dans .env.");
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

const keyData = hexToBuffer(hexKey);

const secretKey = await crypto.subtle.importKey(
  "raw",               
  keyData,  
  { name: "HMAC", hash: "SHA-512" }, 
  true, 
  ["sign", "verify"]  
);

const connections: WebSocket[] = [];

// routes 

router.get("/", (ctx) => {
   ctx.response.status = 200;
   ctx.response.body = "Hello world!";
});

//refresh

async function validateRefreshTokenInDb(name: string, tab: string, refreshToken: string) {
   try{
      const res = await db.execute(
            `SELECT * FROM ${tab} WHERE username = ?`, [name] 
         );
      const user = res.rows[0];
      if (!user || !user.refreshToken) return false;

      return user.refreshToken === refreshToken;
   }
   catch (error ){
      console.error("Erreur DB validation token:", error);
      return false;
   }

}

router.post("/refresh", async (ctx) => {
  const cookieHeader = ctx.request.headers.get("cookie");
  
  //extraire le refresh token du cookie
  const refreshToken = cookieHeader
    ?.split("; ")
    .find(row => row.startsWith("refresh_token="))
    ?.split("=")[1];

  if (!refreshToken) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Pas de  refresh token" };
    return;
  }
  let username: string | null = null;
  let table: string | null = null;

  try {
    const payload = await verify(refreshToken, secretKey);
    username = payload.userName as string;
    table = (payload.isAdmin as boolean) ? "Admin" : "User";
  } catch (err) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Erreur refresh token" };
    return;
  }
  if (!username || !table) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Pas de refresh token ou info manquante" };
    return;
  }

  const isValid = await validateRefreshTokenInDb(username, table, refreshToken);

  if (!isValid) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Refresh token invalide" };
    return;
  }

  const newAccToken = await create(
    { alg: "HS512", typ: "JWT" }, 
    { userName: username, isAdmin: table === "Admin", exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN }, 
    secretKey
  );

  const newRefreshToken = await create(
     { alg: "HS512", typ: "JWT" },
     { userName: username, isAdmin: table === "Admin", exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN },
     secretKey
  );

  await db.execute(`UPDATE ${table} SET refreshToken = ? WHERE username = ?`, [newRefreshToken, username]);

   ctx.response.headers.set(
   "Set-Cookie",
   `auth_token=${newAccToken}; HttpOnly; SameSite=Strict; Max-Age=${ACCESS_TOKEN_EXPIRES_IN}; Path=/`
   );
   ctx.response.headers.append(
   "Set-Cookie",
   `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${REFRESH_TOKEN_EXPIRES_IN}; Path=/`
   );
  ctx.response.status = 200;
  ctx.response.body = { auth_token: newAccToken };
}
);

router.post("/login", async (ctx) => {
   const body = await ctx.request.body.json();
   const { name, passwd,isadmin} = body;
   console.log(body)
   const tab = isadmin ? "Admin" : "User";
   const res = await db.execute(
         `SELECT * FROM ${tab} WHERE username = ?`, [name] 
      );
   const isUser = res.rows?.[0];
   if (!isUser) {
      ctx.response.status = 406;
      ctx.response.body = { error: "Invalid username or password" };
       console.log("existe pas")
      return;
   }

   const peppered = passwd + PEPPER;
   const result = await bcrypt.compare(peppered, isUser.passwordHash);
   if (!result) {
      console.log(" mauvais username et/ou mdp ")
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
   }
   const token = await create(
   { alg: "HS512", typ: "JWT" },
   { userName: isUser.userName, isAdmin: isadmin, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN },
   secretKey
   );
   const refreshToken = await create(
    { alg: "HS512", typ: "JWT" }, 
    { userName: isUser.userName, isAdmin: isadmin, exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN }, 
    secretKey
  );
   await db.execute(
  `UPDATE ${tab} SET refreshToken = ? WHERE username = ?`, 
  [refreshToken, name]);
   
   removeTokenByUser(isUser.userName);
   tokens[token] =isUser.userName;
   
   ctx.response.status = 200;
   ctx.response.headers.set("Set-Cookie", `auth_token=${token}; HttpOnly; SameSite=Strict; Max-Age=900`);
   ctx.response.headers.append("Set-Cookie", `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${REFRESH_TOKEN_EXPIRES_IN}; Path=/`);
   ctx.response.body = { auth_token: token };
   
});

router.post("/inscription", async (ctx) => {
   const body = await ctx.request.body.json();
   const { name, passwd } = body;
   console.log(body)
   const res = await db.execute(
      "SELECT * FROM User WHERE username = ?", [name] 
   );
   const isUser = res.rows?.[0];
   if (isUser) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      console.log("existe deja ")
      return;
   }
   const pass_hash = await get_hash(passwd);

   await db.execute(
   "INSERT INTO User(username, passwordHash) VALUES (?, ?)", [name, pass_hash]
   );

   // ligne ~163 — remplace le bloc inscription
   const token = await create(
   { alg: "HS512", typ: "JWT" },
   { userName: name, isAdmin: false, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN },
   secretKey
   );
   const refreshToken = await create(
   { alg: "HS512", typ: "JWT" },
   { userName: name, isAdmin: false, exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN },
   secretKey
   );
   await db.execute(
   "UPDATE User SET refreshToken = ? WHERE username = ?",
   [refreshToken, name]
   );
   removeTokenByUser(name);
   tokens[token] = name;
   ctx.response.status = 200;
   ctx.response.headers.set("Set-Cookie", `auth_token=${token}; HttpOnly; SameSite=Strict; Max-Age=${ACCESS_TOKEN_EXPIRES_IN}; Path=/`);
   ctx.response.headers.append("Set-Cookie", `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${REFRESH_TOKEN_EXPIRES_IN}; Path=/`);
   ctx.response.body = { auth_token: token };
      
});


// Middleware to verify JWT token
const authorizationMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
   const cookie = ctx.request.headers.get("cookie");
   const authToken = cookie?.split("; ").find(row => row.startsWith("auth_token="))?.split('=')[1];


   if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized: Missing token" };
      return;
   }

   try {
      // Verify the token
      const tokenData = await verify(authToken, secretKey);
      ctx.state.tokenData = tokenData; // Store data in ctx.state for use in other middlewares/routes

      await next();
   } catch {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized: Invalid token" };
   }
   };

   // the cookie is tested in the middleware (the cookie is provided by the browser in a header)
   router.get('/test_cookie', authorizationMiddleware, (ctx) => {
   ctx.response.body = { message: 'Token verified successfully', token_data: ctx.state.tokenData };

});

if (Deno.args.length < 1) {
   console.log(`Usage: $ deno run --allow-net server.ts PORT [CERT_PATH KEY_PATH]`);
   Deno.exit();
}

const options = {port: Deno.args[0]}

if (Deno.args.length >= 3) {

   options.secure = true;
   options.cert = await Deno.readTextFile(Deno.args[1]);
   options.key = await Deno.readTextFile(Deno.args[2]);
   console.log(`SSL conf ready (use https)`);
}

router.get("/chat", authorizationMiddleware, (ctx) => {
   
   if (!ctx.isUpgradable) {
   ctx.throw(501);
   }
   const ws = ctx.upgrade();
   ws.onopen = function() {
   console.log('WebSocket connection established.');
   connections.push(ws);
   };

   ws.onerror = (error) => {
   console.log(`Error: ${error}`);
   };

   ws.onclose = () => {
   console.log("Websocket closed");
   };

   ws.onmessage = async (event) => {
      
      console.log(`Received: ${event.data}`);
      if (event.data === 'pr_button_click'){
         for (let i = 0; i<connections.length; i++){
            if (connections[i].readyState === WebSocket.OPEN){
               connections[i].send("block_temp_for_all")
            }
         }
      }if(event.data === 'join_allowed'){
         for (let i = 0; i<connections.length; i++){
            if (connections[i].readyState === WebSocket.OPEN){
               connections[i].send("all_join_pr")
            }
         }
      }/*if(event.data === 'admin_status'){
         const currentUserName = ctx.state.tokenData.userName;
         const isUser = data.find((u) => u.nom === currentUserName);
         if (isUser) {
               isUser.game_admin = true;
               console.log(`${currentUserName} est désormais l'admin de la partie !`);
            }
      } */
      else{
         for(let i =0; i<connections.length; i++){
            connections[i].send(`${ctx.state.tokenData.userName} : ${event.data}`)
         }
      }

   };
});

router.post("/settings", async (ctx) => {
   const body = await ctx.request.body.json();
   const { nbp, prtime, rtime } = body;
   // current_pr_settings = body;
   // console.log(current_pr_settings);
   ctx.response.status = 200;
});


router.get("/pr", authorizationMiddleware, async (ctx) => {
   if (!ctx.isUpgradable) {
   ctx.throw(501);
   }
   const ws = ctx.upgrade();
   ws.onopen = function() {
   console.log('WebSocket connection established.');
   connections.push(ws);
   };

   ws.onerror = (error) => {
   console.log(`Error: ${error}`);
   };

   ws.onclose = () => {
   console.log("Websocket closed");
   };

   ws.onmessage = async (event) => {
      console.log(`Received: ${event.data}`);
      if (event.data === 'add_new_player'){
         for (let i = 0; i<connections.length; i++){
            if (connections[i].readyState === WebSocket.OPEN){
               connections[i].send("plus one")
            }
         }
      }

   };
});

router.post("/pr", authorizationMiddleware, async (ctx) => {
   try{
      const body = await ctx.request.body.json();
      const {title, content, truthValue} = body;
      const current_username = ctx.state.tokenData.userName;
      const userRes = await db.execute(
               "SELECT idUser FROM User WHERE userName = ?", [current_username]
      );
      const user = userRes.rows?.[0];
      console.log("premier",userRes);
      console.log("deuxieme",user);

      if (!user) {
         ctx.response.status = 404;
         ctx.response.body = { error: "Utilisateur introuvable" };
         return;
      }

      const userId = user.idUser !==undefined ? user.idUser:user[0]; 
      console.log("troisieme",userId)

      await db.execute(
         "INSERT INTO PotinsPartie(title, content, truthValue, id_user) VALUES (?, ?, ?, ?)",
         [title, content, truthValue,userId]
      );

      console.log(`Nouveau potin ajouté par ${current_username}`);

      
      ctx.response.status = 201;
      ctx.response.body = { message: "Potin enregistré avec succès !" };
      // on récupère la liste de tout les potins de la partie 

   }catch (error) {
      console.error("Erreur lors de l'ajout du potin :", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Erreur interne du serveur" };  
   }

});

router.get("/gestion_potin", authorizationMiddleware, async (ctx) =>{
   try{
      const all_potin = await db.execute(
      "SELECT p.*, u.userName FROM PotinsPartie p JOIN User u ON p.id_user = u.idUser"
      );
      const rowsArray = Array.isArray(all_potin.rows) ? all_potin.rows : Object.values(all_potin.rows || {});
      ctx.response.status = 200;
      ctx.response.body = all_potin.rows;

      console.log("table des potins envoyée (${rowsArray.length} lignes).")
   }catch(error){
      console.error("Erreur lors de l'envoie du potin :", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Erreur interne du serveur" }; 
   }
});


app.use(
   oakCors({
      origin: `https://localhost:8080`, // Allow requests from this origin
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed methods
      allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
      credentials: true, // Allow credentials like cookies
   })
);

app.use(router.routes());
app.use(router.allowedMethods())

console.log(`Oak back server running on port ${Deno.args[0]}`);

await app.listen({
  port: Number(Deno.args[0]),
  secure: true,
  key: await Deno.readTextFile("./key.pem"),
  cert: await Deno.readTextFile("./cert.pem"),
});
