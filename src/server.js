// Node modules
const http = require("http");
const https = require("https");
const fs = require("fs");
const { join } = require("path");

process.env.projectRoot = join(process.cwd());

const logger = require("../private_modules/logger");
const router = require("../private_modules/router");
const dbManager = require("./db_manager");

// Route files
const staticRoute = require("./routes/static");
const hotsmokinRoute = require("./routes/hotsmokin");
const usersRoute = require("./routes/users");
const watchlistRoute = require("./routes/watchlist");
const proxyRoute = require("./routes/proxy");

// Fill up process.env with the config file's values
let config;
if (fs.existsSync(__dirname + "/config.js")) {
	config = require(__dirname + "/config");

	// The url that is used to connect to the database
	if (config.databaseUrl) {
		process.env.databaseUrl = config.databaseUrl;
	} else {
		logger.error("Missing property 'databaseUrl' in config.js. Shutting down...");
		process.exit(3);
	}

	// The key that is used to sign JSON Web Tokens
	if (config.jwtKey) {
		process.env.jwtKey = config.jwtKey;
	} else {
		logger.error("Missing property 'jwtKey' in config.js. Shutting down...");
		process.exit(3);
	}
	
	// The maximum age of authentication cookies
	if (config.authTokenMaxAge) {
		process.env.authTokenMaxAge = config.authTokenMaxAge;
	} else {
		logger.error("Missing property 'authTokenMaxAge' in config.js. Shutting down...");
		process.exit(3);
	}
	
	// The domain field of the sent cookies
	if (config.domain !== undefined) {
		process.env.domain = config.domain;
	} else {
		logger.error("Missing property 'domain' in config.js. Shutting down...");
		process.exit(3);
	}
	
	// The secret key for reCAPTCHA validations
	if (config.recaptchaSecretKey !== undefined) {
		process.env.recaptchaSecretKey = config.recaptchaSecretKey;
	} else {
		logger.error("Missing property 'recaptchaSecretKey' in config.js. Shutting down...");
		process.exit(3);
	}
} else {
	logger.error("Couldn't find config.js file. Shutting down...");
	process.exit(3);
}

if (process.env.PRODUCTION &&
		(!fs.existsSync(join(process.env.projectRoot, "certs/ca_bundle.crt")) ||
		!fs.existsSync(join(process.env.projectRoot, "certs/certificate.crt")) ||
		!fs.existsSync(join(process.env.projectRoot, "certs/private.key")))) {

	console.error("A certificate file is missing from 'certs/'. Shutting down...");
	process.exit(4);
}

// Constants
const PORT = process.env.PORT || config.PORT || 1104;

// Other variables
let server;

/**
 * Sets up everything needed for the server and starts it
 */
async function start() {
	// Logger setup
	logger.set("verbose", process.argv.includes("-v") || process.argv.includes("--verbose"));
	logger.set("x-verbose", process.argv.includes("-xv") || process.argv.includes("--extra-verbose"));
	logger.set("silent", process.argv.includes("-s") || process.argv.includes("--silent"));

	const outputArgIndex = process.argv.indexOf("-o");
	if (outputArgIndex !== -1) {
		logger.set("file-output-dir", process.argv[outputArgIndex + 1] || "./logs");
		logger.set("file-output-name", "server");
		logger.set("file-output", true);
	}

	// Ctrl+C exit
	process.on("SIGINT", () => {
		logger.log("Shutting down...");
		logger.close();
		process.exit(0);
	});
	
	// Nodemon restart
	process.once('SIGUSR2', () => {
		logger.log("Restarting...");
		logger.close();
	});

	// Connect to the database
	dbManager.setup();
	// Set up the router module (use every default middleware)
	router.setup();
	
	// Set up routes
	await staticRoute().catch(err => {
		logger.error("Couldn't load static files\nThis might be because the files.json file is missing from the public directory, or because it pointed to a file that doesn't exist.");
		logger.xlog(err);
		logger.log("Shutting down...");
		logger.close();
		process.exit(1);
	});
	hotsmokinRoute();
	usersRoute();
	watchlistRoute();
	proxyRoute();

	if (process.env.PRODUCTION) {
		router.addMiddleware((req, res, done) => {
			res.setHeader("Cache-Control", "no-store");
			done();
		});
		logger.log("SERVER RUNNING IN PRODUCTION MODE");
	}
	
	// Start the server
	if (process.env.PRODUCTION) {
		server = https.createServer({
			key: fs.readFileSync(join(process.env.projectRoot, "certs/private.key")),
			cert: fs.readFileSync(join(process.env.projectRoot, "certs/certificate.crt")),
			ca: fs.readFileSync(join(process.env.projectRoot, "certs/ca_bundle.crt"))
		}, router.requestHandler);
		server.listen(443);

		// HTTP -> HTTPS redirect
		http.createServer((req, res) => {
			res.writeHead(303, { "Location": "https://" + req.headers.host + req.url });
			res.end();
		}).listen(80);

		logger.log(`HTTP server listening on port 80`);
		logger.log(`HTTPS server listening on port 443`);
	} else {
		server = http.createServer(router.requestHandler);
		server.listen(PORT);
		logger.log(`Server listening on port ${PORT}`);
	}
}

start();
