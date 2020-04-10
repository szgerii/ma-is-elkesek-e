const fs = require("fs");
const path = require("path");
const router = require("../private_modules/router");
const loginSplitter = require("../splitters/loginSplitter");

/**
 * Represents a file and its handling properties
 */
class File {
	/**
	 * @constructor
	 * @param {String} url - the url which points to the file
	 * @param {String} filePath - the path of the file
	 * @param {String} type - the MIME type of the file
	 */
	constructor(url, filePath, type) {
		/**
		 * The static URL of the file
		 * @type {String}
		 */
		this.url = url;
		/**
		 * The local path of the file
		 * @type {String}
		 */
		this.path = filePath;
		/**
		 * The MIME type of the file
		 * @type {String}
		 * @example "text/html"
		 */
		this.type = type;
		/**
		 * The content of the file
		 * @type {String}
		 */
		this.content = fs.readFileSync(path.resolve(__dirname, "../public", filePath));
	}
}

/**
 * Sets up the static routes
 * @return {Promise} - A promise that resolves after everything has been set up
 */
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
			// TODO: move notfoundpage declaration back here
			router.setFallback((req, res) => {
				const notFoundPage = fs.readFileSync(path.resolve(__dirname, "../public/404_page/404.html"));
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end(notFoundPage);
			});

			// Landing page
			// TODO: move webpage loading outside of the handler functions (development only)
			router.route("/").getSplitter(loginSplitter,
			// User isn't logged in
			(req, res) => {
				const guestMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_guest.html"));
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(guestMainPage);
			},
			// User is logged in
			async (req, res) => {
				if (!req.showWatchlistByDefault) {
					const loggedInMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_user.html"));
					res.writeHead(200, {"Content-Type": "text/html"});
					res.end(loggedInMainPage);
				} else {
					res.redirect("/watchlist");
				}
			});

			router.route("/home").getSplitter(loginSplitter,
			// User isn't logged in
			(req, res) => {
				const guestMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_guest.html"));
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(guestMainPage);
			},
			// User is logged in
			(req, res) => {
				const loggedInMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_user.html"));
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(loggedInMainPage);
			});

			// Account settings page
			router.route("/account").getSplitter(loginSplitter, (req, res) => {
				res.redirect("/login");
			}, (req, res) => {
				// TODO: move page read outside this function
				const accountSettingsPage = fs.readFileSync(path.resolve(__dirname, "../public/account_page/account.html"));
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(accountSettingsPage);
			});
			
			// Watchlist settings page
			router.route("/watchlist").getSplitter(loginSplitter,
			(req, res) => {
				res.redirect("/login");
			}, (req, res) => {
				// TODO: move page read outside this function
				const watchlistPage = fs.readFileSync(path.resolve(__dirname, "../public/watchlist_page/watchlist.html"));
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(watchlistPage);
			});

			// Logout
			router.route("/logout").post((req, res) => {
				res.writeHead(200, [
					["Content-Type", "text/html"],
					["Set-Cookie", router.genCookie("auth-token", "", {
						domain: process.env.domain,
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Strict",
						httpOnly: true
					})],
					["Set-Cookie", router.genCookie("username", "", {
						domain: process.env.domain,
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Strict"
					})],
				]);
				const guestMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_guest.html"));
				res.end(guestMainPage);
			});	

			resolve();
		} catch (err) {
			reject(err);
		}
	});
};