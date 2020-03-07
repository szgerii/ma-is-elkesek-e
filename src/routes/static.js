const fs = require("fs");
const path = require("path");
const router = require("../private_modules/router");

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
		router.addHandler(file.url, "GET", (req, res) => {
			res.writeHead(200, {"Content-Type": file.type});
			//res.end(file.content);
			res.end(fs.readFileSync(path.resolve(__dirname, "../public", file.path))); // TODO: Replace this line with the previous one (this is only here so the server doesn't need a restart for showing changes in static files)
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
			res.end(fs.readFileSync(path.resolve(__dirname, "../public/404_page/404.html")));
		});

		resolve();
	});
};