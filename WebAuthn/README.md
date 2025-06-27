# Authn

This is a simple application that shows the principle of WebAuthn. You can register new users and login afterward. After the login you see some information about the login itself, like the origin, the relying party Id and so on.
This demo app also has a simple backend server. It's a api written in JavaScript. To keep it simple, it doesn't have a database, it just keeps the data in the memory storage of the server. If you restart the server, all users are gone.

To add a bit more, I choose the Passkeys. The change for that was simple, you have to set the residentKey on preferred. With the passkeys, you now can register and login from different devices. Register a user on the laptop. Generate a new key pair for the user. Take your phone and login and log in with it.

## Run

This project contains a Dockerfile which you can start locally.
You need to do an npm install first, after that start the container with the Docker image.
The container doesn't need any connections to other things.
