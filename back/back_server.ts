import { Application, Router } from "https://deno.land/x/oak@v17.1.6/mod.ts"
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
const router = new Router();
const app = new Application();

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

console.log(await get_hash("admin"));

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
  `UPDATE User SET refreshToken = ? WHERE username = ?`, 
  [refreshToken, name]);
   
   removeTokenByUser(name);
   tokens[token] =name;
   
   ctx.response.status = 200;
   ctx.response.headers.set("Set-Cookie", `auth_token=${token}; HttpOnly; SameSite=Strict; Max-Age=900`);
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

const userMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
   try {
      const username = ctx.state.tokenData.userName;
      const isadmin = ctx.state.tokenData.isAdmin;
      const table = isadmin ? "Admin" : "User";
      const result = await db.execute(
         `SELECT * FROM ${table} WHERE userName = ?`,
         [username]
      );
      const user = result.rows[0];
      if (!user) {
         ctx.response.status = 401;
         ctx.response.body = {
            error: "Utilisateur introuvable"
         };
         return;
      }
      ctx.state.user = user;
      await next();

   } catch(error) {
      console.log(error);
      ctx.response.status = 500;
      ctx.response.body = {
         error: "Erreur serveur"
      };
   }
};

if (Deno.args.length < 1) {
   console.log(`Usage: $ deno run --allow-net server.ts PORT [CERT_PATH KEY_PATH]`);
   Deno.exit();
}

router.get("/chat",authorizationMiddleware,userMiddleware,(ctx) => {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
    }

    const ws = ctx.upgrade();

    const user = ctx.state.user;

    ws.onopen = () => {
      console.log("WebSocket connection established.");

      connections.push({ws,userName: user.userName,idUser: user.idUser});
    };

    ws.onerror = (error) => {
      console.log("Error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");

      // supprimer la connexion
      const index = connections.findIndex(c => c.ws === ws);
      if (index !== -1) connections.splice(index, 1);
    };

    ws.onmessage = async (event) => {

      const data = JSON.parse(event.data);

      if (data.type !== "chat:message") return;

      const sender = ctx.state.user;

      // sauvegarde message
      await db.execute(
        `
        INSERT INTO Message(content, idUser, idGroup)
        VALUES (?, ?, ?)
        `,
        [
          data.message,
          sender.idUser,
          data.groupId
        ]
      );

      // broadcast
      for (const client of connections) {

        client.ws.send(JSON.stringify({
          type: "chat:message",
          groupId: data.groupId,
          username: sender.userName,
          message: data.message
        }));
      }
    };
  }
);

router.post("/addgroup", authorizationMiddleware, async (ctx) => {

   const body = await ctx.request.body.json();

   const { nom, users } = body;

   // utilisateur connecté
   const username = ctx.state.tokenData.userName;

   // récupérer son id
   const result = await db.execute(
      "SELECT idUser FROM User WHERE userName = ?",
      [username]
   );

   const user = result.rows[0];

   // créer le groupe
   await db.execute(
      "INSERT INTO Groups(groupName, groupOwner) VALUES (?, ?)",
      [nom, user.idUser]
   );

   // récupérer l'id du groupe créé
   const groupResult = await db.execute(
      "SELECT LAST_INSERT_ID() as id"
   );

   const groupId = groupResult.rows[0].id;

   // ajouter le propriétaire
   await db.execute(
      "INSERT INTO UserGroup(idUser, idGroup, status) VALUES (?, ?, ?)",
      [user.idUser, groupId, "accepted"]
   );

   // ajouter les invités
   for(let i = 0; i < users.length; i++){

      await db.execute(
         "INSERT INTO UserGroup(idUser, idGroup, status) VALUES (?, ?, ?)",
         [users[i], groupId, "waiting"]
      );
   }

   ctx.response.status = 200;

   ctx.response.body = {
      message: "Groupe créé",
      idGroup: groupId
   };
});
router.get("/groups",authorizationMiddleware,userMiddleware,async (ctx) => {

   const user = ctx.state.user;
   const isadmin = ctx.state.tokenData.isAdmin;

   if(!isadmin){

      const groups = await db.execute(
         `
         SELECT Groups.idGroup, Groups.groupName
         FROM UserGroup
         JOIN Groups ON UserGroup.idGroup = Groups.idGroup
         WHERE UserGroup.idUser = ?
         AND UserGroup.status = 'accepted'
         `,
         [user.idUser]
      );

      ctx.response.status = 200;
      ctx.response.body = groups.rows;

   } else {

      const groups = await db.execute(
         `
         SELECT Groups.idGroup, Groups.groupName
         FROM Groups
         `
      );

      ctx.response.status = 200;
      ctx.response.body = groups.rows;
   }
});
router.get("/users",authorizationMiddleware,userMiddleware,async (ctx) => {
      const user = ctx.state.user;
      const users = await db.execute(
         `
         SELECT idUser, userName
         FROM User
         WHERE userName != ?
         `,
         [user.userName]
      );
      ctx.response.body = users.rows;
   }
);
router.get("/group/usersnotin/:id", authorizationMiddleware, async (ctx) => {

    const groupId = ctx.params.id;

    const res = await db.execute(`
        SELECT idUser, userName
        FROM User
        WHERE idUser NOT IN (

            SELECT idUser
            FROM UserGroup
            WHERE idGroup = ?

        )
    `, [groupId]);

    ctx.response.body = res.rows;
});

router.post("/invitation",authorizationMiddleware,userMiddleware,async (ctx) => {
      try {
         const body = await ctx.request.body.json();
         const { idGroup, action } = body;
         const user = ctx.state.user;

         // ACCEPTER
         if(action === "accept") {
            await db.execute(
               `
               UPDATE UserGroup
               SET status = 'accepted'
               WHERE idUser = ? AND idGroup = ?
               `,
               [user.idUser, idGroup]
            );
            ctx.response.body = {
               message: "Invitation acceptée"
            }; 
            return;
         }
         // REFUSER
         if(action === "refuse") {
            await db.execute(
               `
               DELETE FROM UserGroup
               WHERE idUser = ? AND idGroup = ?
               `,
               [user.idUser, idGroup]
            );
            ctx.response.body = {
               message: "Invitation refusée"
            };
            return;
         }
         ctx.response.status = 400;
         ctx.response.body = {
            error: "Action invalide"
         };
      } catch(error) {
         console.log(error);
         ctx.response.status = 500;
         ctx.response.body = {
            error: "Erreur serveur"
         };
      }
   }
);
router.post("/invite", authorizationMiddleware, async (ctx) => {

    const body = await ctx.request.body.json();

    const { groupId, users } = body;

    for(let i = 0; i < users.length; i++){

        await db.execute(
            `
            INSERT INTO UserGroup(idUser, idGroup, status)
            VALUES (?, ?, ?)
            `,
            [users[i], groupId, "waiting"]
        );
    }

    ctx.response.body = {
        message: "Invitations envoyées"
    };
});
router.get("/group/members/:id", authorizationMiddleware, async (ctx) => {
    const groupId = ctx.params.id;

    const res = await db.execute(`
        SELECT User.idUser, User.userName
        FROM UserGroup
        JOIN User ON UserGroup.idUser = User.idUser
        WHERE UserGroup.idGroup = ?
        AND UserGroup.status = 'accepted'
    `, [groupId]);

    ctx.response.body = res.rows;
});

app.use(
   oakCors({
      origin: `https://localhost:8080`, // Allow requests from this origin
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed methods
      allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
      credentials: true, // Allow credentials like cookies
   })
);
router.post("/logout", (ctx) => {

    ctx.response.headers.set(
        "Set-Cookie",
        "auth_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/"
    );

    ctx.response.headers.append(
        "Set-Cookie",
        "refresh_token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/"
    );

    ctx.response.body = {
        message: "Déconnecté"
    };
});
router.get(
    "/invitations",
    authorizationMiddleware,
    userMiddleware,
    async (ctx) => {

        const user = ctx.state.user;

        const res = await db.execute(`
            SELECT
                Groups.idGroup,
                Groups.groupName
            FROM UserGroup
            JOIN Groups
                ON UserGroup.idGroup = Groups.idGroup
            WHERE UserGroup.idUser = ?
            AND UserGroup.status = 'waiting'
        `, [user.idUser]);

        ctx.response.body = res.rows;
    }
);
router.post("/group/leave", authorizationMiddleware, userMiddleware, async (ctx) => {

    const body = await ctx.request.body.json();
    const { idGroup } = body;

    const user = ctx.state.user;

    await db.execute(
        `
        DELETE FROM UserGroup
        WHERE idUser = ? AND idGroup = ?
        `,
        [user.idUser, idGroup]
    );

    ctx.response.body = {
        message: "Groupe quitté"
    };
});

router.get(
    "/messages/:id",
    authorizationMiddleware,
    async (ctx) => {

        const groupId = ctx.params.id;

        const res = await db.execute(`
            SELECT
                Message.content,
                Message.sendDate,
                User.userName
            FROM Message
            JOIN User
                ON Message.idUser = User.idUser
            WHERE Message.idGroup = ?
            ORDER BY Message.sendDate ASC
        `, [groupId]);

        ctx.response.body = res.rows;
    }
);
console.log(`Oak back server running on port ${Deno.args[0]}`);

app.use(router.routes());
app.use(router.allowedMethods())
await app.listen({
  port: Number(Deno.args[0]),
  secure: true,
  key: await Deno.readTextFile("./key.pem"),
  cert: await Deno.readTextFile("./cert.pem"),
});
