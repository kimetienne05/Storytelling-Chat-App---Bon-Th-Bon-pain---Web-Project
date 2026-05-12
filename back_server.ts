
import { Application, Router } from "https://deno.land/x/oak@v17.1.6/mod.ts"
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
const router = new Router();
const app = new Application();

//pepper:
const PEPPER = Deno.env.get("PASSWORD_PEPPER");
if (!PEPPER) throw new Error("PASSWORD_PEPPER env var is not set");

const SALT_ROUNDS = 12;

// base données pour la connexion

const data = [ 
 {id : '1', nom: "baptpoulpe", password_hash : await get_hash("test"), connecte : false },
 {id : '2',nom : "emie", password_hash : await get_hash("animal"), connecte : false },
 {id : '3',nom : "aanor", password_hash : await get_hash("vache"), connecte : false },
 {id : '4',nom : "kim",password_hash : await get_hash("tunnel"), connecte : false },
]

/* test sql
import mysql from "mysql";

// Minimal connection config (edit as needed or use env vars)
const connection = mysql.createConnection({
  host: Deno.env.get("MYSQL_HOST") || "localhost",
  port: Number(Deno.env.get("MYSQL_PORT") || "3306"),
  user: Deno.env.get("MYSQL_USER") || "root",
  password: Deno.env.get("MYSQL_PASSWORD") || "",
  database: Deno.env.get("MYSQL_DATABASE") || "test",
});

connection.connect((err) => {
  if (err) {
    console.error("Connection error:", err);
    return;
  }
  console.log("Connected!");
  connection.query("SELECT VERSION() AS version", (err, results) => {
    if (err) {
      console.error("Query error:", err);
    } else {
      console.log("MySQL version:", results[0].version);
    }
    connection.end();
  });
});
*/



// foncttions

async function get_hash(password: string): Promise<string> {
 const saltRounds = 10;
 const peppered = password + PEPPER;
 const salt = await bcrypt.genSalt(saltRounds); // Generate the salt manually
 return await bcrypt.hash(peppered, salt); // Pass the salt to the hash function
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
   const peppered = passwd + PEPPER;
   const result = await bcrypt.compare(peppered, isUser.password_hash);
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
         for(var i =0; i<connections.length; i++){
            connections[i].send(`${ctx.state.tokenData.userName} : ${event.data}`);
         }
      };
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