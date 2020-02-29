const fs = require("fs");
const router = require("../private_modules/router");
const files = [];

function loadFiles() {
	// Load public files into the files array
	files.push(fs.readFileSync(__dirname + "/../public/index.html")); // 0
	files.push(fs.readFileSync(__dirname + "/../public/style.css")); // 1
	files.push(fs.readFileSync(__dirname + "/../public/script.js")); // 2
	files.push(fs.readFileSync(__dirname + "/../public/lib/jQuery.js")); // 3
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/background.png")); // 4
	files.push(fs.readFileSync(__dirname + "/../public/assets/images/icon.png")); // 5
}

module.exports = () => {
	loadFiles();

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
	
	router.addHandler("/jQuery.js", "GET", (req, res) => {
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

	router.setFallback((req, res) => {
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("404: Page Not Found");
	});
};