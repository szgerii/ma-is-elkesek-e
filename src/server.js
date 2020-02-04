const   http     = require('http'),
		fs       = require('fs'),
		mongoose = require('mongoose'),
		section  = require('./models/section');

const PORT = 1104 || process.env.PORT;
const DB_URL = "mongodb+srv://node-server:9ahtrXRyp5sRvm77@ma-is-elkesek-e-ejiov.mongodb.net/ma-is-elkesek-e?retryWrites=true&w=majority";
const server = http.createServer(router);

// Store the files in memory
const files = [];

let lastDBCheck, hot1, hot2, hot3;

mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.connection.on("connected", () => {
	console.log(`Successfully connected to MongoDB on ${DB_URL}`);
});

getHotSmokin();
start();

// Loads files into memory and starts listening on PORT
function start() {
	files.push(fs.readFileSync(__dirname + "/public/index.html")); // 0
	files.push(fs.readFileSync(__dirname + "/public/styles.css")); // 1
	files.push(fs.readFileSync(__dirname + "/public/script.js")); // 2
	files.push(fs.readFileSync(__dirname + "/public/lib/Jquery.js")); // 3
	files.push(fs.readFileSync(__dirname + "/public/assets/images/background.png")); // 4
	files.push(fs.readFileSync(__dirname + "/public/assets/images/icon.png")); // 5

	server.listen(PORT);
	console.log(`Server listening on port ${PORT}`);
}

async function router(req, res) {
	await parseReq(req);
	
	// Check if the method is correct
	if (req.method === "GET") {
		// Send response to client
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

			case "/Jquery.js":
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
				res.writeHead(200, {"Content-Type": "application/json"});
				const resp = await JSON.stringify(await getHotSmokin());
				res.end(resp);
				//res.end(JSON.stringify(await getHotSmokin()));
				break;

			default:
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end("404: Page Not Round");
				break;
		}
	} else if (req.method === "POST") {
		let data = [];
		
		req.on("data", chunk => {
			data.push(chunk);
		});
	
		req.on("end", async () => {
			req.body = await queryParser(decodeURIComponent(data.concat().toString()), false);
			
			switch (req.baseUrl) {
				case "/hotsmokin":
					const b = req.body;
					await updateHotSmokin(b.lineId, b.lineName, b.stop1Id, b.stop1Name, b.stop2Id, b.stop2Name);
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

function parseReq(req) {
	const urlParts = req.url.split('?');
	req.baseUrl = urlParts[0];

	if (!urlParts[1])
		return;

	req.query = queryParser(urlParts[1]);
}

function queryParser(rawQuery, detectType) {
	const query = {};

	rawQuery.split('&').forEach(data => {
		const splitData = data.split('=');
		
		if (!detectType) {
			query[splitData[0]] = splitData[1];
		} else if (splitData[1] === "true") {
			query[splitData[0]] = true;
		} else if (splitData[1] === "false") {
			query[splitData[0]] = false;
		} else if (!Number.isNaN(Number(splitData[1]))) {
			query[splitData[0]] = Number(splitData[1]);
		} else {
			query[splitData[0]] = splitData[1];
		}
	});

	return query;
}

async function updateHotSmokin(lineId, lineName, stop1Id, stop1Name, stop2Id, stop2Name) {
	let sec = await section.findOne({ lineId: lineId, stop1Id: stop1Id, stop2Id: stop2Id });
	
	if (sec) {
		sec.count++;
		await sec.save();
	} else {
		sec = new section();
		sec.lineId = lineId;
		sec.stop1Id = stop1Id;
		sec.stop2Id = stop2Id;
		console.log(lineName);
		sec.lineName = lineName.replace(/\+/g, " ");
		sec.stop1Name = stop1Name.replace(/\+/g, " ");
		sec.stop2Name = stop2Name.replace(/\+/g, " ");
		sec.count = 1;
		await sec.save();
	}
}

function getHotSmokin() {
	if (!lastDBCheck || Date.now() - lastDBCheck > 30000 || !hot1 || !hot2 || !hot3) {
		hot1 = null;
		hot2 = null;
		hot3 = null;
		
		section.find({}).sort("-count").limit(3).exec((err, secs) => {
			if (err) {
				console.log(err);
				return;
			}

			if (secs.length >= 1) {
				hot1 = {
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
				hot2 = {
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
				hot3 = {
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
		});

		lastDBCheck = Date.now();
	}

	return {
		hot1: hot1,
		hot2: hot2,
		hot3: hot3
	};
}