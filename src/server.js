let reqBody;
const   http     = require('http'),
		fs       = require('fs'),
		mongoose = require('mongoose'),
		section  = require('./models/section');

// HTTP server stuff
const PORT = 1104 || process.env.PORT;
const DB_URL = "mongodb+srv://node-server:9ahtrXRyp5sRvm77@ma-is-elkesek-e-ejiov.mongodb.net/ma-is-elkesek-e?retryWrites=true&w=majority";
const server = http.createServer(router);

// Store the files in memory
const files = [];

mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.connection.on("connected", () => {
	console.log(`Successfully connected to MongoDB on ${DB_URL}`);
});

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
				if (req.query.raw) {
					// send back RAW JSON
				} else {
					// send back HTML leaderboard page
				}
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
			req.body = await queryParser(decodeURIComponent(data.concat().toString()));
			
			switch (req.baseUrl) {
				case "/hotsmokin":
					await updateHotSmokin(req.body.line, req.body.stop1, req.body.stop2);
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

function queryParser(rawQuery) {
	const query = {};

	rawQuery.split('&').forEach(data => {
		const splitData = data.split('=');
		
		if (splitData[1] === "true") {
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

async function updateHotSmokin(line, stop1, stop2) {
	let sec = await section.findOne({ line: line, stop1: stop1, stop2: stop2 });
	
	if (sec) {
		sec.count++;
		await sec.save();
	} else {
		sec = new section();
		sec.line = line;
		sec.stop1 = stop1;
		sec.stop2 = stop2;
		sec.count = 1;
		await sec.save();
	}
}