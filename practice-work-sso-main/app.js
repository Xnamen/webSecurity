const express = require("express");
const session = require("express-session");
const { Issuer, generators } = require("openid-client");
const axios = require("axios");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Configure Express to use EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Configure session middleware
app.use(
  session({
    name: "m183.sid",
    secret: "super-secure-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

let client; // OpenID client instance

// Async IIFE (Immediately Invoked Function Expression) to discover OIDC configuration and initialize the client
(async () => {
  const issuer = await Issuer.discover(
    "well-known-url"
  );

  client = new issuer.Client({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uris: [process.env.REDIRECT_URI],
    response_types: ["code"],
  });
})();

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

// Initiates login flow with PKCE (Proof Key for Code Exchange)
app.get("/login", (req, res) => {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  req.session.codeVerifier = codeVerifier;

  const authUrl = client.authorizationUrl({
    // TODO: Add the required scopes
    scope: "openid profile email offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  res.redirect(authUrl);
});

// Callback after successful login
app.get("/callback", async (req, res) => {
  const params = client.callbackParams(req);

  const tokenSet = await client.callback(process.env.REDIRECT_URI, params, {
    code_verifier: req.session.codeVerifier,
  });

  req.session.tokenSet = tokenSet;
  req.session.userinfo = await client.userinfo(tokenSet.access_token);

  res.redirect("/profile");
});

// Display user profile
app.get("/profile", (req, res) => {
  if (!req.session.tokenSet) {
    return res.redirect("/");
  }

  res.render("profile", {
    userinfo: req.session.userinfo,
    tokenSet: req.session.tokenSet,
  });
});

// Protected API endpoint calling a remote protected resource
app.get("/protected", async (req, res) => {
  // TODO: Check if the user is authenticated (i.e., if the session has a tokenSet)
  if (!req.session.tokenSet.access_token){
    return res.status(401).json({ message: "You need to login first!!!"})
  }

  // TODO: Check if the user has the required scope
  // Hint: Have a look at the .well-known openid-configuration to see all available scopes!
  if (!req.session.tokenSet.scope.includes("TODO_TOKEN_SET")){
    return res.status(403).json({message: "Forbidden: You don't have the permission to do that."})
  }

  // TODO: Call the remote protected resource
  const protectedEndpointUrl =
    "https://fastapi-sso-154522763511.europe-west6.run.app/sso-protected";
  try {
    // Hint: You might want to add a header to the request (https://axios-http.com/docs/req_config)
    const apiResponse = await axios.get(protectedEndpointUrl, {
      headers: {
        Authorization: `Bearer ${req.session.tokenSet.access_token}`
      }
    });

    res.json({
      message: "Access granted to protected resource!",
      remoteData: apiResponse.data,
    });
  } catch (error) {
    console.error(
      "Error accessing remote protected endpoint:",
      error.response?.data || error.message
    );
    res.status(500).send("Failed to fetch remote protected resource.");
  }
});

// Refresh tokens
app.get("/refresh", async (req, res) => {
  if (!req.session.tokenSet?.refresh_token) {
    return res.send("💩 No refresh token available.");
  }

  const refreshedTokenSet = await client.refresh(
    req.session.tokenSet.refresh_token
  );
  req.session.tokenSet = refreshedTokenSet;

  res.redirect("/profile");
});

// Logout user
app.get("/logout", (req, res) => {
  if (!req.session.tokenSet?.id_token) {
    req.session.destroy(() => {
      res.redirect("/");
    });
  } else {
    const endSessionUrl = client.endSessionUrl({
      id_token_hint: req.session.tokenSet.id_token,
      post_logout_redirect_uri: "http://localhost:3000/",
    });

    req.session.destroy(() => {
      res.redirect(endSessionUrl);
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
