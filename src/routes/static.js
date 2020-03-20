const fs = require("fs");
const path = require("path");
const router = require("../private_modules/router.js");

class File {
	constructor(url, filePath, type) {
		this.url = url;
		this.path = filePath;
		this.type = type;
		this.content = fs.readFileSync(path.resolve(__dirname, "../public", filePath));
	}
}

function setup() {
	const fileList = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../public/files.json"))).map(f => {
		return new File(f.url, f.path, f.type);
	});
	
	for (const file of fileList) {
		router.route(file.url).get((req, res) => {
			res.writeHead(200, {"Content-Type": file.type});
			res.end(file.content);
		});
	}
}

module.exports = () => {
	return new Promise((resolve, reject) => {
		try {
			setup();
		} catch (err) {
			reject(err);
		}
	
		router.setFallback((req, res) => {
			res.writeHead(404, {"Content-Type": "text/html"});
			res.end("404: Page Not Found");
		});

		resolve();
	});
};