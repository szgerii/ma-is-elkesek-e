// Node modules
const http = require("http");
const fs = require("fs");
const logger = require("./private_modules/logger");
const router = require("./private_modules/old-router.js");
const dbManager = require("./db_manager");

// Router files
const staticRoute = require("./routes/static");
const hotsmokinRoute = require("./routes/hotsmokin");
const usersRoute = require("./routes/users");
const watchlistRoute = require("./routes/watchlist");

// Config file content
let config;
if (fs.existsSync("./config.js")) {
	config = require("./config");
	if (config.databaseUrl) {
		process.env.databaseUrl = config.databaseUrl;
	} else {
		logger.error("Missing property 'databaseUrl' in config.js. Shutting down...");
		process.exit(3);
	}
	
	if (config.jwtKey) {
		process.env.jwtKey = config.jwtKey;
	} else {
		logger.error("Missing property 'jwtKey' in config.js. Shutting down...");
		process.exit(3);
	}
} else {
	logger.error("Couldn't find config.js file. Shutting down...");
	process.exit(3);
}

// Constants
const PORT = process.env.PORT || config.PORT || 1104;

// Other variables
let server;

// Sets up everything needed for the server
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

	// Ctrl+C
	process.on("SIGINT", () => {
		logger.log("Shutting down...");
		logger.close();
		process.exit(0);
	});
	
	process.once('SIGUSR2', function () {
		logger.log("Restarting...");
		logger.close();
	});

	dbManager.setup();
	
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

	server = http.createServer(router.requestHandler)
	server.listen(PORT);
	logger.log(`Server listening on port ${PORT}`);
}

start();
