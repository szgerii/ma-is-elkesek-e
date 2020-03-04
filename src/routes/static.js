const fs = require("fs");
const path = require("path");
const router = require("../private_modules/router");
const files = [];

class File {
	constructor(url, path, type) {
		this.url = url;
		this.path = path;
		this.type = type;
		this.content = fs.readFileSync(path);
	}
}

/*function loadFiles() {
	// Load public files into the files array
	files.push(fs.readFileSync(__dirname + "/../public/index.html")); // 0
	files.push(fs.readFileSync(__dirname + "/../public/style.css")); // 1
	files.push(fs.readFileSync(__dirname + "/../public/script.js")); // 2
	files.push(fs.readFileSync(__dirname + "/../public/lib/jQuery.js")); // 3
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/icon.png")); // 4
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-bus.png")); // 5
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-tram.png")); // 6
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-metro.png")); // 7
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-hev.png")); // 8
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-trolley.png")); // 9
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/bg-ship.png")); // 10
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-bus.png")); // 11
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-tram.png")); // 12
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-metro.png")); // 13
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-hev.png")); // 14
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-trolley.png")); // 15
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/stopSign-ship.png")); // 16
}*/

function loadFiles() {
	const fileList = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../public/files.json"))).map(f => {
		return new File(f.url, f.path, f.type);
	});
	
	for (const file of fileList) {
		router.addHandler(file.url, "GET", (req, res) => {
			res.writeHead(200, {"Content-Type": file.type});
			res.end(file.content);
		});
	}
}

module.exports = () => {
	loadFiles();

	router.setFallback((req, res) => {
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("404: Page Not Found");
	});
};