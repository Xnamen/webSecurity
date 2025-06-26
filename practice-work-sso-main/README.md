# Node.js OAuth2 & OpenID Connect Boilerplate

This project demonstrates OAuth2 and OpenID Connect authentication using school-app as the identity provider. For security reasons i removed all specifig names and secrets.

## ✨ Features

- Login via OpenID Connect
- Retrieve and view:
  - ID Token
  - Access Token
  - Refresh Token
- Refresh the Access Token
- Protected endpoint
  - Trigger the call to an external, protected endpoint
  - Display the response/data
- Logout

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Set appropriate values for the following environment variables within the [compose.yaml](compose.yaml) file:

- `CLIENT_ID`: Your application's Client ID provided by the Identity Provider (school-app)
- `CLIENT_SECRET`: Your application's Client Secret provided by the Identity Provider
- `REDIRECT_URI`: Redirect URI registered with the Identity Provider

> The client for working on this task has already been registered. The actual values for the mentioned environment variables are given in the task description.

## 🐳 Run with Docker

Using Docker Compose:

```bash
docker compose up --build
```

> Add the flag `-d` to the command to run the container in detached mode.

## 💡 Learnings

### OpenID Connect

_In this scenario, **who is the identity provider**? School App or Microsoft? Explain..._

In this case both are identity providers. From this app you will get redirected to the school app, the school app provides the application with the ID token and Refresh token. In this scope the school app is the identity provider. However, if we look at the bigger scope we see that the school app redirects you again to https://login.microsoftonline.com/ and the user finally authenticates himself with his microsoft account.
So in this braoder sense Microsoft is the identity providern and the school app is just a middle man to forward the user to microsoft.
So finaly i would say in this whole scope Microsoft is the provider. Which you can see if you analyze your JWT in jwt.io there is a flag called idp (Identity providor)

```json
"idp": "Microsoft",
```

### PKCE - Proof Key for Code Exchange

_Describe briefly what PKCE is, why it is needed and how it is realized. On which lines in [app.js](app.js) can you find the corresponding implementation?_

PKCE is used to prove that the key which is used origanaly also was intended for the user and it is not an stolen key. To check that the application generates a random code. This code verifier is used to create an code challange by hashing. Now the challange is sent to the identity provider together with the authorization request. This challange is then saved by the identity provider and its used again when the application recived the authorization code and wants to exchange it for an access token. In this request the code verifier is also sent to the identity provider which hashes the code verifier and if the saved challange from before matches the hashed code verifier it gets approved.

In the code you can also see the diffrent steps on those lines:
Line 52: Generate code verifier
Line 53: Generate code challenge
Line 60: Add code challenge to authorization request
Line 72: Add code verifier to token request
