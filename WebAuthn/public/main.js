// public/main.js
const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

const btnRegister = document.getElementById('btnRegister');
const btnLogin = document.getElementById('btnLogin');
const messageDiv = document.getElementById('message');


function showMessage(msg, isError = false) {
    messageDiv.textContent = msg;
    messageDiv.className = isError ? 'error' : 'success';
}

btnRegister.addEventListener('click', async () => {
    const username = document.getElementById('regUsername').value;
    if (!username) {
        showMessage('Bitte einen Benutzernamen eingeben.', true);
        return;
    }

    try {
        showMessage('Starte Registrierung...');
        // Request registration options from the server
        const resp = await fetch('/register/begin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });
        const options = await resp.json();
        if (options.error) throw new Error(options.error);

        // Start WebAuthn registration
        const cred = await startRegistration(options);

        // Send registration result to the server for verification
        const verificationResp = await fetch('/register/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, cred }),
        });
        const verificationResult = await verificationResp.json();

        if (verificationResult.success) {
            showMessage('Registrierung erfolgreich! Du wirst zum Dashboard weitergeleitet.');
            setTimeout(() => window.location.href = '/dashboard', 1500); // Redirect after a short delay
        } else {
            throw new Error(verificationResult.error || 'Registrierung fehlgeschlagen.');
        }
    } catch (err) {
        console.error(err);
        showMessage('Fehler: ' + err.message, true);
    }
});

btnLogin.addEventListener('click', async () => {
    try {
        showMessage('Starte Anmeldung...');

        // Request authentication options from the server
        const resp = await fetch('/login/begin', { method: 'POST' });
        const options = await resp.json();
        if (options.error) throw new Error(options.error);

        // Start WebAuthn authentication
        const cred = await startAuthentication(options);

        // Send authentication result to the server for verification
        const verificationResp = await fetch('/login/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cred }),
        });
        const verificationResult = await verificationResp.json();

        if (verificationResult.success) {
            showMessage('Anmeldung erfolgreich! Leite zum Dashboard weiter...');
            window.location.href = '/dashboard'; // Redirect immediately
        } else {
            throw new Error(verificationResult.error || 'Anmeldung fehlgeschlagen.');
        }
    } catch (err) {
        console.error(err);
        showMessage('Fehler: ' + err.message, true);
    }
});