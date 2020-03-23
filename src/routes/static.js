const fs = require("fs");
const path = require("path");
const router = require("../private_modules/router");
const loginSplitter = require("../splitters/loginSplitter");

class File {
	constructor(url, filePath, type) {
		this.url = url;
		this.path = filePath;
		this.type = type;
		this.content = fs.readFileSync(path.resolve(__dirname, "../public", filePath));
	}
}

module.exports = () => {
	return new Promise((resolve, reject) => {
		try {
			// Setup routing for files included in files.json
			const fileList = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../public/files.json"))).map(f => {
				return new File(f.url, f.path, f.type);
			});
			
			for (const file of fileList) {
				router.route(file.url).get((req, res) => {
					res.writeHead(200, {"Content-Type": file.type});
					//res.end(file.content);
					res.end(fs.readFileSync(path.resolve(__dirname, "../public", file.path))); // TODO: Replace this line with the previous one (this is only here so the server doesn't need a restart for showing changes in static files)
				});
			}

			// -- Special cases --
			
			// 404
			const notFoundPage = fs.readFileSync(path.resolve(__dirname, "../public/404_page/404.html"));
			router.setFallback((req, res) => {
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end(notFoundPage);
			});

			// Landing page
			const guestMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_guest.html"));
			const loggedInMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_logged_in.html"));
			
			router.route("/").getSplitter(loginSplitter,
				// User isn't logged in
				(req, res) => {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.end(guestMainPage);
				},
				// User is logged in
				(req, res) => {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.end(loggedInMainPage);
			});

			// Logout
			router.route("/logout").post((req, res) => {
				res.writeHead(200, [
					["Content-Type", "text/html"],
					["Set-Cookie", router.genCookie("auth-token", "", {
						domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Strict",
						httpOnly: true
					})],
					["Set-Cookie", router.genCookie("username", "", {
						domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Strict"
					})],
				]);
				res.end(guestMainPage);
			});	

			resolve();
		} catch (err) {
			reject(err);
		}
	});
};