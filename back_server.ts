
import { Application, Router } from "https://deno.land/x/oak@v17.1.6/mod.ts"
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
const router = new Router();
const app = new Application();
const clients = new Set();
// base données pour la connexion

const data = [ 
 {id : '1', nom: "baptpoulpe", password_hash : await get_hash("test"), connecte : false, game_admin : false },
 {id : '2',nom : "emie", password_hash : await get_hash("animal"), connecte : false, game_admin : false },
 {id : '3',nom : "aanor", password_hash : await get_hash("vache"), connecte : false, game_admin : false },
 {id : '4',nom : "kim",password_hash : await get_hash("tunnel"), connecte : false, game_admin : false },
]

const pr_settings =[{nbp: '5', prtime: '30', rtime :'30'}]
let current_pr_settings ={pr_settings};

export const les_potins: any[] = [];
// foncttions

async function get_hash(password: string): Promise<string> {
 const saltRounds = 10;
 const salt = await bcrypt.genSalt(saltRounds); // Generate the salt manually
 return await bcrypt.hash(password, salt); // Pass the salt to the hash function
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

const secretKey = await crypto.subtle.generateKey(
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

router.post("/login", async (ctx) => {
   const body = await ctx.request.body.json();
   const { name, passwd } = body;
   console.log(body)
   const isUser = data.find((u) => u.nom === name );

   if (!isUser || isUser.connecte == true) {
      console.log(" mauvais username et/ou mdp ")
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
   }

   const result = await bcrypt.compare(passwd, isUser.password_hash);
   if (!result) {
      console.log(" mauvais username et/ou mdp ")
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
   }
   isUser.connecte = true;
   const token = await create({ alg: "HS512", typ: "JWT" }, { userName: isUser.nom }, secretKey);
   
   removeTokenByUser(isUser.nom);
   tokens[token] =isUser.nom;
   
   ctx.response.status = 200;
   ctx.response.headers.set("Set-Cookie", `auth_token=${token}; HttpOnly; SameSite=Strict; Max-Age=3600`);
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
      }if(event.data === 'admin_status'){
         const currentUserName = ctx.state.tokenData.userName;
         const isUser = data.find((u) => u.nom === currentUserName);
         if (isUser) {
               isUser.game_admin = true;
               console.log(`${currentUserName} est désormais l'admin de la partie !`);
            }
      }
      else{
         for(let i =0; i<connections.length; i++){
            connections[i].send(`${ctx.state.tokenData.userName} : ${event.data}`);
         }
      }

   };
});

router.post("/settings", async (ctx) => {
   const body = await ctx.request.body.json();
   const { nbp, prtime, rtime } = body;
   current_pr_settings = body;
   console.log(current_pr_settings);
   ctx.response.status = 200;
});

router.post("/", async (ctx) => {
   const body = await ctx.request.body.json();
   const { name, passwd } = body;
   console.log(body)
   const isUser = data.find((u) => u.nom === name );

   if (!isUser || isUser.connecte == true) {
      console.log(" mauvais username et/ou mdp ")
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
   }

   const result = await bcrypt.compare(passwd, isUser.password_hash);
   if (!result) {
      console.log(" mauvais username et/ou mdp ")
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid username or password" };
      return;
   }
   isUser.connecte = true;
   const token = await create({ alg: "HS512", typ: "JWT" }, { userName: isUser.nom }, secretKey);
   
   removeTokenByUser(isUser.nom);
   tokens[token] =isUser.nom;
   
   ctx.response.status = 200;
   ctx.response.headers.set("Set-Cookie", `auth_token=${token}; HttpOnly; SameSite=Strict; Max-Age=3600`);
   ctx.response.body = { auth_token: token };
   
});

router.get("/pr", authorizationMiddleware, (ctx) => {
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
         const info_settings={
            action: "current pr settings",
            donnees:current_pr_settings
         };
         ws.send(JSON.stringify(info_settings));
      }

   };
});
router.post("/pr", async (ctx) => {
   const body = await ctx.request.body.json();
   const { titre, post, veracité } = body;
   current_pr_settings = body;
   console.log(current_pr_settings);
   ctx.response.status = 200;
});

app.use(
   oakCors({
      origin: `http://localhost:8080`, // Allow requests from this origin
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed methods
      allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
      credentials: true, // Allow credentials like cookies
   })
);
console.log(`Oak back server running on port ${options.port}`);

app.use(router.routes());
app.use(router.allowedMethods())
await app.listen(options);