require('dotenv').config();

import express, { urlencoded, json } from 'express';
import session from 'express-session';

import { getPaste, newPaste, filterPastes } from './routes/paste';
import { getMetrics } from './routes/metrics';

const urlRegex = new RegExp("(?<protocol>https?):\/\/(?<hostname>[A-Za-z.0-9]*)\/?:?(?<port>\d*)", "g");
const urlMatch = urlRegex.exec(process.env.SITE_URL);

const protocol = urlMatch.groups.protocol ? urlMatch.groups.protocol : "http";
const hostname = urlMatch.groups.hostname ? urlMatch.groups.hostname : "localhost";
const port = urlMatch.groups.port ? urlMatch.groups.port : 8080;

let sessionEnvironment = {
    secret: process.env.SECRET,
    cookie: {},
    resave: true,
    saveUninitialized: true
};

function initRoutes() {
	// General routes
	app.get('/ip', (request, response) => response.send({ ip: request.ip}))
	app.get('/', (_, response) => response.send({ status: "up" }));
	app.get('/metrics', getMetrics);

	// Paste API handler
	const pastesRouter = app.router("/pastes")
	pastesRouter.post('/', createPasteLimiter, newPaste);
	pastesRouter.get('/:id', getPaste);
	pastesRouter.get('/', filterPastes); 

	/* 
		-- Routes to be implemented --
		pastesRouter.delete('/', paste.delete);

		-- Users API handler | Not yet implemented either --
		app.post('/auth', loginAccountLimiter, user.auth)
		app.post('/users', createAccountLimiter, user.new)
		app.get('/users/:id', user.get);
		app.get('/users', users.filter); 
	*/
	
	return { pastesRouter }
}

function initExpressRouter() {
	const app = express();

	//TODO: don't use hardcoded values
	app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
	app.use(session(sessionEnvironment));
	app.set('view engine', 'ejs');

	app.use(urlencoded({ extended: true, limit: '10mb' }));
	app.use(json({ limit: '10mb' }));

	app.use(initRoutes().pastesRouter)
	
	return app
}

function setupServer() {
	const expressBackend = initExpressRouter()

	if (protocol.includes("https")) {
	    sessionEnvironment.cookie.secure = true;
	    logger.log("Using secure cookies");
	}

	expressBackend.listen(port, () => {
	    console.log(`pastebin.fi API listening at ${protocol}://${hostname}:${port}`);
	});
}

setupServer()
