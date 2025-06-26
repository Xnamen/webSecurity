const { webcrypto } = require('node:crypto');
global.crypto = webcrypto;
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const app = express();
const PORT = 3000;

const RP_NAME = 'Praxisarbeit10 WebAuthn';
const RP_ID = 'localhost';
const ORIGIN = `http://${RP_ID}:${PORT}`;

app.use(express.static('./public'));
app.use(express.json());
app.use(session({
    secret: '6136fcd4-6814-4117-a6cb-4f9674fd1c35',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

const users = {};

app.post('/register/begin', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || users[username]) {
            return res.status(400).json({ error: 'Benutzername ungültig oder bereits vergeben.' });
        }
        const userID = crypto.randomBytes(16);
        users[username] = { id: userID, username, authenticators: [] };
        const options = await generateRegistrationOptions({
            rpName: RP_NAME, rpID: RP_ID, userID: users[username].id, userName: users[username].username,
            timeout: 300000, attestationType: 'none',
            authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        });
        req.session.challenge = options.challenge;
        req.session.registerUsername = username;
        return res.json(options);
    } catch (e) {
        console.error('Error in /register/begin:', e);
        if (req.body.username) { delete users[req.body.username]; }
        return res.status(500).json({ error: 'Server-Fehler bei der Initialisierung der Registrierung.' });
    }
});

app.post('/register/complete', async (req, res) => {
    const { cred } = req.body;
    const username = req.session.registerUsername;
    if (!username || !users[username] || !req.session.challenge) {
        return res.status(400).json({ error: 'Registrierungsprozess nicht gefunden.' });
    }
    const user = users[username];
    const expectedChallenge = req.session.challenge;
    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: cred, expectedChallenge, expectedOrigin: ORIGIN, expectedRPID: RP_ID, requireUserVerification: false,
        });
    } catch (error) {
        console.error(error);
        delete users[username];
        return res.status(400).json({ error: 'Verifizierung fehlgeschlagen: ' + error.message });
    }

    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
        const { credentialPublicKey, counter, userVerified } = registrationInfo;
        const newAuthenticator = {
            credentialID: Buffer.from(cred.id, 'base64url'),
            credentialPublicKey: Buffer.from(credentialPublicKey),
            counter,
            transports: cred.response.transports || [],
        };
        user.authenticators.push(newAuthenticator);

        req.session.userId = user.id.toString('base64url');
        req.session.username = user.username;

        req.session.loginInfo = {
            credentialID: newAuthenticator.credentialID.toString('base64url'),
            userVerified: userVerified,
            newCounter: newAuthenticator.counter,
        };

        delete req.session.challenge;
        delete req.session.registerUsername;

        return res.json({ success: true });
    } else {
        delete users[username];
        return res.status(400).json({ error: 'Registrierung konnte nicht verifiziert werden.' });
    }
});

app.post('/login/begin', async (req, res) => {
    try {
        const options = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: 'preferred' });
        req.session.challenge = options.challenge;
        return res.json(options);
    } catch (e) {
        console.error('Error in /login/begin:', e);
        return res.status(500).json({ error: 'Server-Fehler bei der Initialisierung des Logins.' });
    }
});

app.post('/login/complete', async (req, res) => {
    const { cred } = req.body;
    const expectedChallenge = req.session.challenge;
    let user;
    let authenticator;

    for (const u of Object.values(users)) {
        const foundAuth = u.authenticators.find(
            auth => auth.credentialID.toString('base64url') === cred.id
        );
        if (foundAuth) {
            user = u;
            authenticator = foundAuth;
            break;
        }
        if (authenticator) break;
    }

    if (!user || !authenticator) {
        return res.status(404).json({ error: 'Authenticator nicht registriert.' });
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: cred, expectedChallenge, expectedOrigin: ORIGIN, expectedRPID: RP_ID, authenticator, requireUserVerification: false,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Anmelde-Verifizierung fehlgeschlagen: ' + error.message });
    }

    const { verified, authenticationInfo } = verification;
    if (verified) {
        authenticator.counter = authenticationInfo.newCounter;
        req.session.userId = user.id.toString('base64url');
        req.session.username = user.username;
        req.session.loginInfo = {
            credentialID: authenticator.credentialID.toString('base64url'),
            userVerified: authenticationInfo.userVerified,
            newCounter: authenticationInfo.newCounter
        };
        delete req.session.challenge;
        return res.json({ success: true });
    } else {
        return res.status(400).json({ error: 'Anmeldung konnte nicht verifiziert werden.' });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) { return res.redirect('/'); }
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/api/user-info', (req, res) => {
    if (!req.session.userId) { return res.status(401).json({ error: 'Nicht angemeldet.' }); }
    res.json({
        username: req.session.username,
        loginInfo: req.session.loginInfo,
        rpId: RP_ID,
        origin: ORIGIN,
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) { return res.status(500).json({ error: 'Abmeldung fehlgeschlagen.' }); }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});

