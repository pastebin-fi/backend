# pastebin.fi API

This is the API for [pastebin.fi](https://pastebin.fi). The frontend can be found [here](https://github.com/pastebin-fi/frontend).

Documentation for the API can be viewed at [api.pastebin.fi/docs](https://api.pastebin.fi/docs). The openapi spec is loaded from [openapi.json](./src/openapi.json).

## Deployment

Docker image is automatically built to [github content registry](https://github.com/pastebin-fi/backend/pkgs/container/backend) from master branch. The same image is also automatically pulled with watchtower to the server (polling interval is 10 seconds).

## Stack

### Backend

- Node.JS (version 18)
- MongoDB (mongoose)
- Express
- Docker (not required for development)

The server stores everything to MongoDB. This project utilizes MongoDB's full text search to provide a way to query information from the server.

S3 has been tried as a storage but it had following problems:
- Wasabi had some hiccups from time to time (requests did not finish), but this could be caused by the free trial.
- I had no easy to provide full text search to paste content

## Setup

First of all, you should setup the environment variables (see [here](#Configuration-variables)). I would recommend to copy the `.env.example` file to `.env` (command is `cp .env.example .env`).

### Without Docker

First install required packages with `npm install`. 

You need two terminals for development:

1. `npx tsc -w` (this watches the code and recompiles it on every change to `./target` dir)
2. `nodemon app.js` (this command must be ran inside `./target` dir; you might need to copy the openapi.json file to `./target` dir also)

Since the project uses typescript you cannot just start the project with `node .`, but have to use `npx tsc app` (accept the typescript install prompt if present).

### With Docker

`docker-compose.yml` contains an example configuration. The configuration variables below work also as environment variables.

## Configuration variables

| Key | Description |
| --- | ----------- |
| mongo_uri | Example: `mongodb+srv://user:pass@host/database`. This is the URI that MongoDB tries to connect to. It should be in format `mongodb+src://<user>:<password>@<hostname>/<database>` |
| site_url | Example: `http://localhost:3000`. The app parser required info from it. |
| trust_proxy | Number of proxies to trust (handy when using reverse proxy). |
| secret | Should be something random and unique. |
