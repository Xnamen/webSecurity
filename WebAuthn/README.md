# Authn

This is a simple application which shows the principle of WebAuthn. You can register new users and login afterwards. After the login you see some informations about the login itself, like the origin, the relying party Id and so on.
This demo app also has a simple backend server. Its a api written in javascript. To keep it simple it doesn't have a database it just keeps the data in the memory storage of the server. If you restart the server all users are gone.

To add a bit more i choose the Passkeys. The change for that was simple you just have to set the residentKey on preferred. With the passkeys you now can register and login from diffrent devices. Register a user on the laptop. Generate a new key pair for the user. Take your phone and login and log in with it.
