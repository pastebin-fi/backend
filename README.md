# PowerPaste
Best pastebin software ever

## Stack

### Backend

- Node.JS (version 16)
- EJS
- MongoDB (mongoose)

### Frontend

- Tailwind (daisyUI)
- CodeMirror (the text editor)

## Setup

First of all, you should setup the environment variables (see [here](#environment-variables)). I would recommend to copy the `.env.example` file to `.env` (command is `cp .env.example .env`).

### Without Docker

Simply run the project with `node .`

If you are developing something I would suggest to use nodemon (`npm i -g nodemon`). It reloads the app everytime something changes: `nodemon.`

### With Docker

Write later...

## Environment variables

| Key         | Description      |
| ----------- | ---------------- |
| MONGO_URI   | Example: `mongodb+srv://user:pass@host/database`. This is the URI that MongoDB tries to connect to. It should be in format `mongodb+src://<user>:<password>@<hostname>/<database>` |
| SITE_URL    | Example: `http://localhost:3000`. The app parser required info from it. |
| TITLE       | Defines the site title. 
| DESCRIPTION | Describe your pastebin. Visible in some places. |
| TRUST_PROXY | Number of proxies to trust (handy when using reverse proxy). |
| SECRET      | Should be something random and unique. |