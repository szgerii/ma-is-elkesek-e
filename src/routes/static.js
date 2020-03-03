const fs = require("fs");
const router = require("../private_modules/router");
const files = [];

function loadFiles() {
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
	
	router.addHandler("/assets/images/bg-bus.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[5]);
	});
	
	router.addHandler("/assets/images/bg-tram.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[6]);
	});
	
	router.addHandler("/assets/images/bg-metro.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[7]);
	});
	
	router.addHandler("/assets/images/bg-hev.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[8]);
	});
	
	router.addHandler("/assets/images/bg-trolley.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[9]);
	});
	
	router.addHandler("/assets/images/bg-ship.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[10]);
	});
	
	router.addHandler("/assets/images/stopSign-bus.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[11]);
	});
	
	router.addHandler("/assets/images/stopSign-tram.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[12]);
	});
	
	router.addHandler("/assets/images/stopSign-metro.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[13]);
	});
	
	router.addHandler("/assets/images/stopSign-hev.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[14]);
	});
	
	router.addHandler("/assets/images/stopSign-trolley.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[15]);
	});
	
	router.addHandler("/assets/images/stopSign-ship.png", "GET", (req, res) => {
		res.writeHead(200, {"Content-Type": "image/png"});
		res.end(files[16]);
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