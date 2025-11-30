import dotenv from 'dotenv';
import express from "express";
import passport from "passport";
import session from "express-session";
import { Strategy as SteamStrategy } from "../../lib/passport-steam/index.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const possibleEnvPaths = [
  join(__dirname, '.env'),           // Same directory as app.js
  join(__dirname, '..', '.env'),     // One level up
  join(__dirname, '..', '..', '.env'), // Two levels up (project root)
  join(__dirname, '..', '..', '..', '.env'), // Three levels up
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`\nLoading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('\n⚠️  No .env file found in any common locations!');
  // Try loading without path as fallback
  dotenv.config();
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new SteamStrategy(
    {
      returnURL: "http://localhost:3000/auth/steam/return",
      realm: "http://localhost:3000/",
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      process.nextTick(() => {
        profile.identifier = identifier;
        return done(null, profile);
      });
    }
  )
);

const app = express();

app.set("views", join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "your secret",
    name: "name of session id",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(join(__dirname, "../../public")));

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/account", ensureAuthenticated, (req, res) => {
  res.render("account", { user: req.user });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get(
  "/auth/steam",
  passport.authenticate("steam", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get(
  "/auth/steam/return",
  passport.authenticate("steam", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.listen(3000, () => {
  console.log('\n=== SERVER STARTED ===');
  console.log('Server running on http://localhost:3000');
  console.log('STEAM_API_KEY status:', process.env.STEAM_API_KEY ? 'LOADED' : 'MISSING');
});