// Node modules
const http = require("http");
const fs = require("fs");
const logger = require("./private_modules/logger");
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
const server = http.createServer(router);
const files = [];

setup();

// Sets up everything needed for the server
function setup() {
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
	files.push(fs.readFileSync(__dirname + "/public/styles.css")); // 1
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
	
	server.listen(PORT);
	logger.log(`Server listening on port ${PORT}`);
}

// The request handler function
function router(req, res) {
	parseReq(req);
	
	logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
	
	res.on("finish", () => {
		logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
	});

	if (req.method === "GET") {
		switch (req.baseUrl) {
			case "/":
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(files[0]);
				break;
			
			case "/styles.css":
				res.writeHead(200, {"Content-Type": "text/css"});
				res.end(files[1]);
				break;
			
			case "/script.js":
				res.writeHead(200, {"Content-Type": "text/javascript"});
				res.end(files[2]);
				break;

			case "/jquery.js":
				res.writeHead(200, {"Content-Type": "text/javascript"});
				res.end(files[3]);
				break;

			case "/assets/images/background.png":
				res.writeHead(200, {"Content-Type": "image/png"});
				res.end(files[4]);
				break;
	
			case "/assets/images/icon.png":
				res.writeHead(200, {"Content-Type": "image/png"});
				res.end(files[5]);
				break;
			
			case "/hotsmokin":
				dbManager.getHotSmokin().then(top3 => {
					res.writeHead(200, {"Content-Type": "application/json"});
					res.end(JSON.stringify(top3));
				}).catch(err => {
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end("{}");
					logger.error("Couldn't get top 3 list from database");
					logger.xlog(err);
				});
				break;
			
			default:
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end("404: Page Not Round");
				break;
		}
	} else if (req.method === "POST") {
		parseBody(req).then(body => {
			switch (req.baseUrl) {
				case "/hotsmokin":
					dbManager.updateSection({
						lineId: body.lineId,
						lineName: body.lineName,
						stop1Id: body.stop1Id,
						stop1Name: body.stop1Name,
						stop2Id: body.stop2Id,
						stop2Name: body.stop2Name
					}).then(() => {
						res.writeHead(200, {"Content-Type": "text/html"});
						res.end("Successfully updated section in the database");
					}).catch(err => {
						if (err.name === "InformationMissingError") {
							res.writeHead(422, {"Content-Type": "text/html"});
							res.end(err.message);
						} else {
							logger.error("Couldn't update a section in the database");
							logger.xlog(err);
							res.writeHead(500, {"Content-Type": "text/html"});
							res.end("We were unable to update section in the database");
						}
					});
					break;

				/*
					Response codes:
					200 - successful registration
					409 - a user with that username already exists
					422 - a mandatory field was missing or the data wasn't correct (e.g. too short username)
				*/
				case "/users":
					dbManager.createUser({
						username: body.username,
						email: body.email,
						password: body.password,
						showWatchlistByDefault: body.showWatchlistByDefault === "true" ? true : false
					}).then(() => {
						logger.xlog("Successfully registered new user");
						res.writeHead(200, {"Content-Type": "text/html"});
						res.end("Successfully added the user to the database");
					}).catch(err => {
						if (err.name === "ValidationError") {
							res.writeHead(422, {"Content-Type": "text/html"});
							res.end("The request body contained invalid information");
						} else if (err.name === "UserAlreadyExistsError") {
							res.writeHead(409, {"Content-Type": "text/html"});
							res.end(err.message);
						} else if (err.name === "InformationMissingError") {
							res.writeHead(422, {"Content-Type": "text/html"});
							res.end(err.message);
						} else {
							logger.error("Couldn't add user to the database");
							logger.error(err);
							res.writeHead(500, {"Content-Type": "text/html"});
							res.end("Unknown error: couldn't add user to the database");
						}
					});
					break;
				
				default:
					res.writeHead(404, {"Content-Type": "text/html"});
					res.end("404: Page Not Round");
					break;
			}
		});
	} else {
		res.writeHead(405, {"Content-Type": "text/html"});
		res.end(`405: Érvénytelen HTTP metódus (${req.method})`);
	}
}

/*
	Returns a promise that parses a requests body
	Resolves with the body object
*/
function parseBody(req) {
	return new Promise((resolve, reject) => {
		let data = [];
		
		req.on("data", chunk => {
			data.push(chunk);
		});
	
		req.on("end", () => {
			const body = queryParser(decodeURIComponent(data.concat().toString()), false);
			resolve(body);
		});
	});
}

/*
	Fills up the request object with the base url (without queries) and a separate query object
	req: request object
*/
function parseReq(req) {
	const urlParts = req.url.split("?");
	req.baseUrl = urlParts[0];
	req.urlParts = req.baseUrl.split("/");
	req.urlParts.shift(); // Get rid of empty element (e.g. ['', 'users', '123'] -> ['users'. '123'])

	req.ip = (req.headers["x-forwarded-for"] || "").split(",").pop() ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;
	
	if (!urlParts[1])
		return;
		
	req.query = queryParser(urlParts[1]);
}

/*
	Parses a query string into a query object
	rawQuery: the unparsed query string
	detectType: if true, the function converts the query values, if possible
*/
function queryParser(rawQuery, detectType) {
	const query = {};

	rawQuery.split("&").forEach(data => {
		const splitData = data.split("=");
		
		if (!detectType)
			query[splitData[0]] = splitData[1];
		else if (splitData[1] === "true")
			query[splitData[0]] = true;
		else if (splitData[1] === "false")
			query[splitData[0]] = false;
		else if (!Number.isNaN(Number(splitData[1])))
			query[splitData[0]] = Number(splitData[1]);
		else
			query[splitData[0]] = splitData[1];
	});

	return query;
}