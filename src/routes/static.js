const fs = require("fs");
const path = require("path");
const router = require("../../private_modules/router");
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
					res.end(file.content);
				});
			}

			// -- Special cases --

			// Webpages
			const guestMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_guest.html"));
			const userMainPage = fs.readFileSync(path.resolve(__dirname, "../public/main_page/main_user.html"));
			const notFoundPage = fs.readFileSync(path.resolve(__dirname, "../public/404_page/404.html"));
			const accountSettingsPage = fs.readFileSync(path.resolve(__dirname, "../public/account_page/account.html"));
			const watchlistPage = fs.readFileSync(path.resolve(__dirname, "../public/watchlist_page/watchlist.html"));
			const guestAboutPage = fs.readFileSync(path.resolve(__dirname, "../public/about_page/about_guest.html"));
			const userAboutPage = fs.readFileSync(path.resolve(__dirname, "../public/about_page/about_user.html"));
			
			// 404
			router.setFallback((req, res) => {
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end(notFoundPage);
			});

			// Landing page
			router.route("/").getSplitter(loginSplitter,
			// User isn't logged in
			(req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(guestMainPage);
			},
			// User is logged in
			async (req, res) => {
				if (!req.showWatchlistByDefault) {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.end(loggedInMainPage);
				} else {
					res.redirect("/watchlist");
				}
			});

			
			router.route("/home").getSplitter(loginSplitter,
			// User isn't logged in
			(req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(guestMainPage);
			},
			// User is logged in
			(req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(userMainPage);
			});

			// Account settings page
			router.route("/account").getSplitter(loginSplitter, (req, res) => {
				res.redirect("/login");
			}, (req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(accountSettingsPage);
			});
			
			// Watchlist page
			router.route("/watchlist").getSplitter(loginSplitter,
			(req, res) => {
				res.redirect("/login");
			}, (req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(watchlistPage);
			});
			
			// About page
			router.route("/about").getSplitter(loginSplitter,
			(req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(guestAboutPage);
			}, (req, res) => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end(userAboutPage);
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
				res.end(guestMainPage);
			});	

			resolve();
		} catch (err) {
			reject(err);
		}
	});
};