# pastebin.fi API

![7d uptime badge](https://status.protokolla.fi/api/v1/endpoints/03---pastebin-fi_pastebin-fi---backend/uptimes/7d/badge.svg)
![7d response time badge](https://status.protokolla.fi/api/v1/endpoints/03---pastebin-fi_pastebin-fi---backend/response-times/7d/badge.svg)
![health badge (up or down)](https://status.protokolla.fi/api/v1/endpoints/03---pastebin-fi_pastebin-fi---backend/health/badge.svg)

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

Creating & viewing a paste looks like this (currently the whole LangAPI implementation is missing).

<!-- ![```seqdiag {
  frontend  -> API [label = "POST /pastes"];
  API  -> LangAPI [label = "POST / (detect language)"];
  API <-- LangAPI [label = "{ lang: python }"];
  API -> MongoDB [label = "save paste & lang"];
  API <-- MongoDB [label = "return success"];
  frontend <-- API [label = "return success"];
  frontend -> API [label = "GET /pastes/:id"];
  API -> MongoDB [label = "get paste w/ metadata"];
  API <-- MongoDB [label = "return raw content"];
  API -> LangAPI [label = "MISSING POST / (content)", color = red];
  API <-- LangAPI [label = "MISSING retun html", color = red];
  frontend <-- API [label = "return content w/ highlight.js highlight"];
}```](https://kroki.io/seqdiag/svg/eNqNkV9LwzAUxd_9FIc-iANr3-cfUJRRcDqob-JD1lzTSpbO5NYhY9_dpHSbpcX6kIeQ37n3nBNHn7IUCtsT4N1WhslIIL7B7SLFqxZL0rhGtHjOXpCshWNy0dulh8N74B6FUUMsziQx5QztgVoomhx1V3E8oNs26BTrby4qg92R92vmlVHV_d0v3IkvQuMIp42yO78vsMS1NXB1npNrUxwiB0nXzp94r6DZw6GfZFrKEe-KuLW-SbAiFlKw-Kd_KzbIGxvc2dIvdJ5mWfo0w_5DWtUkOvcDdGU9Y0mO_Mp-SNhuUPBKD8jHa2x3h7xFqQrtD198uOMlZNn9AJvHxes=) -->

### cors

// TODO: create a table of env variables

To enable cors you have to set two env variables:
- ENABLE_CORS=true or false (make sure that everything is lower case)
- ALLOWED_CORS_ORIGINS=https://siteyouwanttoallowapiaccess.com (this takes urls separated by commas (no whitespaces allowed), you cannot use * since it does not work with allow credentials). For more information, see: https://www.npmjs.com/package/cors#configuration-options (origin).

Example
```yaml
ENABLE_CORS=true
ALLOWED_CORS_ORIGINS=https://pastebin.fi,http://localhost:3000
```

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

see `.env.example`
