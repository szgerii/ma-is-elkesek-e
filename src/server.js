// Node modules
const http = require("http");
const fs = require("fs");
const logger = require("./private_modules/logger");
const router = require("./private_modules/router");
const dbManager = require("./db_manager");

// Config file (e.g. for DB information)
let config;
if (fs.existsSync("./config.js")) {
	config = require("./config");
} else {
	logger.error("Couldn't find config.js file. Shutting down...");
	process.exit(3);
}

// Constants
const PORT = process.env.PORT || config.PORT || 1104;

// Other variables
let server;
const files = [];

// Sets up everything needed for the server
function start() {
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

	dbManager.getHotSmokin().catch(err => {
		logger.error("Couldn't get top 3 list from database");
		logger.xlog(err);
	});

	// Load public files into files
	files.push(fs.readFileSync(__dirname + "/public/index.html")); // 0
	files.push(fs.readFileSync(__dirname + "/public/style.css")); // 1
	files.push(fs.readFileSync(__dirname + "/public/script.js")); // 2
	files.push(fs.readFileSync(__dirname + "/public/lib/jquery.js")); // 3
	files.push(fs.readFileSync(__dirname + "/public/assets/images/background.png")); // 4
	files.push(fs.readFileSync(__dirname + "/public/assets/images/icon.png")); // 5

	// DB setup
	dbManager.connect(config.databaseUrl).catch(err => {
		logger.error("Couldn't connect to the database. Shutting down...");
		logger.xlog(err);
		process.exit(1);
	});
	
	dbManager.connection.on("connected", () => {
		logger.log("Successfully connected to the database");
	});
	
	dbManager.connection.on("error", err => {
		logger.error("Database connection was terminated. Shutting down...");
		logger.xlog(err);
		process.exit(1);
	});
	
	server = http.createServer(router.requestHandler)
	server.listen(PORT);
	logger.log(`Server listening on port ${PORT}`);
}

router.addHandler("/", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(files[0]);
});

router.addHandler("/style.css", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/css"});
	res.end(files[1]);
});

router.addHandler("/script.js", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/javascript"});
	res.end(files[2]);
});

router.addHandler("/jquery.js", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/javascript"});
	res.end(files[3]);
});

router.addHandler("/assets/images/background.png", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "image/png"});
	res.end(files[4]);
});

router.addHandler("/assets/images/icon.png", "GET", (req, res) => {
	res.writeHead(200, {"Content-Type": "image/png"});
	res.end(files[5]);
});

router.addHandler("/api/hotsmokin", "GET", (req, res) => {
	dbManager.getHotSmokin().then(top3 => {
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(genResponse("success", top3));
	}).catch(err => {
		res.writeHead(500, {"Content-Type": "application/json"});
		res.end(genResponse("error", "Couldn't get top 3 sections from the database"));
		logger.error("Couldn't get top 3 list from database");
		logger.xlog(err);
	});
});

router.addHandler("/api/hotsmokin", "POST", (req, res) => {
	dbManager.updateSection({
		lineId: req.body.lineId,
		lineName: req.body.lineName,
		stop1Id: req.body.stop1Id,
		stop1Name: req.body.stop1Name,
		stop2Id: req.body.stop2Id,
		stop2Name: req.body.stop2Name
	}).then(() => {
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(genResponse("success", null));
	}).catch(err => {
		if (err.name === "InformationMissingError") {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(genResponse("fail", err.data));
		} else {
			logger.error("Couldn't update a section in the database");
			logger.xlog(err);
			res.writeHead(500, {"Content-Type": "application/json"});
			res.end(genResponse("error", "We were unable to update the section in the database"));
		}
	});
});

router.addHandler("/api/users", "POST", (req, res) => {
	dbManager.createUser({
		username: req.body.username,
		password: req.body.password,
		showWatchlistByDefault: req.body.showWatchlistByDefault || true
	}).then(() => {
		logger.xlog("Successfully registered new user");
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end(genResponse("success", null));
	}).catch(err => {
		if (err.name === "ValidationError") {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(genResponse("fail", err.data));
		} else if (err.name === "UserAlreadyExistsError") {
			res.writeHead(409, {"Content-Type": "application/json"});
			res.end(genResponse("fail", {
				username: err.message
			}));
		} else if (err.name === "InformationMissingError") {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(genResponse("fail", err.data));
		} else {
			logger.error("Couldn't add user to the database");
			logger.error(err);
			res.writeHead(500, {"Content-Type": "application/json"});
			res.end(genResponse("error", "Couldn't add user to the database"));
		}
	});
});

router.setFallback((req, res) => {
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end("404: Page Not Round");
});

start();

function genResponse(status, data) {
	if (status === "error") {
		return JSON.stringify({
			"status": status,
			"message": data
		});
	}

	return JSON.stringify({
		"status": status,
		"data": data
	});
}