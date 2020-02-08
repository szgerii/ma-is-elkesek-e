// Node modules
const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const logger = require('./private_modules/logger');

// Mongoose models
const section = require('./models/section');

// Constants
const PORT = 1104 || process.env.PORT;
const DB_URL = "mongodb+srv://node-server:9ahtrXRyp5sRvm77@ma-is-elkesek-e-ejiov.mongodb.net/ma-is-elkesek-e?retryWrites=true&w=majority";
const DB_REFRESH_INTERVAL = 30000; // milliseconds

// Other variables
const server = http.createServer(router);
const files = [];
const top3 = {}; // Hot smokin top 3 sections
let lastDBCheck; // Last hot smokin top 3 pull from DB

setup();

// Sets up everything needed for the server
async function setup() {
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
	process.on('SIGINT', () => {
		logger.log("Shutting down...");
		logger.close();
		process.exit(0);
	});

	getHotSmokin().catch(err => {
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

	// Mongoose setup
	mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }).catch(err => {
		logger.error("Couldn't connect to the database. Shutting down...");
		logger.xlog(err);
		process.exit(1);
	});
	
	mongoose.connection.on("connected", () => {
		logger.log(`Successfully connected to the database`);
	});
	
	mongoose.connection.on("error", err => {
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

	const ip = (req.headers['x-forwarded-for'] || '').split(',').pop() || 
    	req.connection.remoteAddress || 
    	req.socket.remoteAddress || 
    	req.connection.socket.remoteAddress;
	logger.xlog(`${req.method} request at ${req.url} from ${ip}`);
	
	if (req.method === "GET") {
		switch (req.baseUrl) {
			case "/":
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(files[0]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;
			
			case "/styles.css":
				res.writeHead(200, {"Content-Type": "text/css"});
				res.end(files[1]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;
			
			case "/script.js":
				res.writeHead(200, {"Content-Type": "text/javascript"});
				res.end(files[2]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;

			case "/jquery.js":
				res.writeHead(200, {"Content-Type": "text/javascript"});
				res.end(files[3]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;

			case "/assets/images/background.png":
				res.writeHead(200, {"Content-Type": "image/png"});
				res.end(files[4]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;

			case "/assets/images/icon.png":
				res.writeHead(200, {"Content-Type": "image/png"});
				res.end(files[5]);
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;
			
			case "/hotsmokin":
				getHotSmokin().then(top3 => {
					res.writeHead(200, {"Content-Type": "application/json"});
					res.end(JSON.stringify(top3));
					logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				}).catch(err => {
					logger.error("Couldn't get top 3 list from database");
					logger.xlog(err);
				});
				break;

			default:
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end("404: Page Not Round");
				logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
				break;
		}
	} else if (req.method === "POST") {
		let data = [];
		
		req.on("data", chunk => {
			data.push(chunk);
		});
	
		req.on("end", async () => {
			req.body = queryParser(decodeURIComponent(data.concat().toString()), false);

			switch (req.baseUrl) {
				case "/hotsmokin":
					const b = req.body;
					updateSection(b.lineId, b.lineName, b.stop1Id, b.stop1Name, b.stop2Id, b.stop2Name);
					break;
			
				default:
					res.writeHead(404, {"Content-Type": "text/html"});
					res.end("404: Page Not Round");
					logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
					break;
			}
		});
	} else {
		res.writeHead(405, {"Content-Type": "text/html"});
		res.end(`405: Érvénytelen HTTP metódus (${req.method})`);
		logger.xlog(`Sending ${res.statusCode} response to ${ip}`);
	}
}

/*
	Fills up the request object with the base url (without queries) and a separate query object
	req: request object
*/
function parseReq(req) {
	const urlParts = req.url.split('?');
	req.baseUrl = urlParts[0];

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

	rawQuery.split('&').forEach(data => {
		const splitData = data.split('=');
		
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

/*
	Looks up a section in the database and
		a) increments its count by one if it founds it
		b) creates it if it doesn't exist yet
	lineId: id of the line (lookup value)
	lineName: name of the line
	stop1Id: id of the first stop (lookup value)
	stop1Name: name of the first stop
	stop2Id: id of the second stop (lookup value)
	stop2Name: name of the second stop
*/
async function updateSection(lineId, lineName, stop1Id, stop1Name, stop2Id, stop2Name) {
	let sec = await section.findOne({ lineId: lineId, stop1Id: stop1Id, stop2Id: stop2Id });
	
	if (sec) {
		sec.count++;
		await sec.save();
		logger.xlog(`Increased the following section's count in the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
	} else {
		sec = new section();
		sec.lineId = lineId;
		sec.stop1Id = stop1Id;
		sec.stop2Id = stop2Id;
		sec.lineName = lineName.replace(/\+/g, " ");
		sec.stop1Name = stop1Name.replace(/\+/g, " ");
		sec.stop2Name = stop2Name.replace(/\+/g, " ");
		sec.count = 1;
		await sec.save();
		logger.xlog(`Adding the following section to the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
	}
}

/*
	Returns a promise that checks if the top 3 list should be updated and
		a) calls the update function if necessary, and resolves with the top 3 list
		b) resolves the top 3 list if update isn't necessary
		c) rejects with the error if something went wrong
*/
function getHotSmokin() {
	return new Promise((resolve, reject) => {
		if (!lastDBCheck || Date.now() - lastDBCheck > DB_REFRESH_INTERVAL || !top3.hot1 || !top3.hot2 || !top3.hot3) {
			updateHotSmokin().then(() => {
				logger.xlog("Successfully refreshed top 3 section from database");
				resolve(top3);
			}).catch(err => {
				reject(err);
			});
			
			lastDBCheck = Date.now();
		} else {
			logger.xlog(`Responding with cached top 3 list, ${DB_REFRESH_INTERVAL - (Date.now() - lastDBCheck)} ms before next update`);
			resolve(top3);
		}
	});
}

/*
	Returns a promise that updates the top 3 hot smokin section from the database and
		a) resolves if the update was successful
		b) rejects with the error if something went wrong
*/
function updateHotSmokin() {
	return new Promise((resolve, reject) => {
		top3.hot1 = null;
		top3.hot2 = null;
		top3.hot3 = null;
		
		section.find({}).sort("-count").limit(3).exec((err, secs) => {
			if (err) {
				reject(err);
			}

			if (secs.length >= 1) {
				top3.hot1 = {
					line: {
						id: secs[0].lineId,
						name: secs[0].lineName
					},
					stop1: {
						id: secs[0].stop1Id,
						name: secs[0].stop1Name
					},
					stop2: {
						id: secs[0].stop2Id,
						name: secs[0].stop2Name
					}
				};
			}

			if (secs.length >= 2) {
				top3.hot2 = {
					line: {
						id: secs[1].lineId,
						name: secs[1].lineName
					},
					stop1: {
						id: secs[1].stop1Id,
						name: secs[1].stop1Name
					},
					stop2: {
						id: secs[1].stop2Id,
						name: secs[1].stop2Name
					}
				};
			}

			if (secs.length >= 3) {
				top3.hot3 = {
					line: {
						id: secs[2].lineId,
						name: secs[2].lineName
					},
					stop1: {
						id: secs[2].stop1Id,
						name: secs[2].stop1Name
					},
					stop2: {
						id: secs[2].stop2Id,
						name: secs[2].stop2Name
					}
				};
			}

			resolve();
		});
	});
}