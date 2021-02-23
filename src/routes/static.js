const fs = require("fs");
const path = require("path");

const md5 = require("md5");

const router = require("../../private_modules/router");
const loginSplitter = require("../splitters/loginSplitter");

const devPath = path.join(process.env.projectRoot, "src")
const prodPath = path.join(process.env.projectRoot, "dist")
const basePath = process.env.PRODUCTION ? prodPath : devPath;

const STATIC_CACHE_TIMEOUT = 30 * 24 * 3600; // in seconds

/**
 * @abstract
 */
class FileHandler {
	/**
	 * @constructor
	 * @param {String} url - the url which points to the file
	 * @param {String} type - the MIME type of the file
	 */
	constructor(url, type) {
		if (this.serve === undefined) {
			throw new Error("The 'serve' abstract method wasn't implemented in a sub class of FileHandler, or an instance of the FileHandler abstract class was created.");
		}
		
		/**
		 * The static URL of the file
		 * @type {String}
		 */
		this.url = url;
		/**
		 * The MIME type of the file
		 * @type {String}
		 * @example "text/html"
		 */
		this.type = type;
	}
}

class StaticFileHandler extends FileHandler {
	/**
	 * @constructor
	 * @param {String} url - the url which points to the file
	 * @param {String} type - the MIME type of the file
	 * @param {String} filePath - the local path of the file
	 */
	constructor(url, type, filePath) {
		super(url, type);
		
		/**
		 * The local path of the file
		 * @type {String}
		 */
		this.path = filePath;

		if (process.env.PRODUCTION && ["text/html", "text/css", "text/javascript"].includes(this.type)) {
			if (fs.existsSync(path.join(basePath, "public", filePath + ".gz")))
				this.contentGzip = fs.readFileSync(path.join(basePath, "public", filePath + ".gz"));
			if (fs.existsSync(path.join(basePath, "public", filePath + ".br")))
				this.contentBrotli = fs.readFileSync(path.join(basePath, "public", filePath + ".br"));
			this.content = fs.readFileSync(path.join(basePath, "public", filePath));
		} else {
			this.content = fs.readFileSync(path.join(basePath, "public", filePath));
		}

		if (process.env.PRODUCTION)
			this.contentHash = md5(this.content);
	}

	serve(req, res) {
		if (process.env.PRODUCTION) {
			res.setHeader("Cache-Control", `public, max-age=${STATIC_CACHE_TIMEOUT}`);
			res.setHeader("ETag", this.contentHash);
			
			if (this.type === "text/html")
				res.setHeader("Cache-Control", "no-cache");
			
			if (req.headers["if-none-match"] === this.contentHash) {
				res.writeHead(304);
				res.end();
				return;
			}
		}

		if (!req.headers["accept-encoding"]) {
			res.writeHead(200, {"Content-Type": this.type});
			res.end(this.content);
		} else if (req.headers["accept-encoding"].indexOf("br") !== -1 && this.contentBrotli) {
			res.writeHead(200, {
				"Content-Type": this.type,
				"Content-Encoding": "br"
			});
			res.end(this.contentBrotli);
		} else if (req.headers["accept-encoding"].indexOf("gzip") !== -1 && this.contentGzip) {
			res.writeHead(200, {
				"Content-Type": this.type,
				"Content-Encoding": "gzip"
			});
			res.end(this.contentGzip);
		} else {
			res.writeHead(200, {"Content-Type": this.type});
			res.end(this.content);
		}
	}
}

class GuestOnlyFileHandler extends StaticFileHandler {
	constructor(url, type, path) {
		super(url, type, path);
	}

	async serve(req, res) {
		const split = await loginSplitter(req, res); // 0 if guest, 1 if user

		if (split === 0)
			super.serve(req, res);
		else
			res.redirect("/");
	}
}

class UserOnlyFileHandler extends StaticFileHandler {
	constructor(url, type, path) {
		super(url, type, path);
	}

	async serve(req, res) {
		const split = await loginSplitter(req, res); // 0 if guest, 1 if user

		if (split === 0)
			res.redirect("/login");
		else
			super.serve(req, res);
	}
}

class CustomLoginFileHandler extends FileHandler {
	constructor(url, type, filePath) {
		super(url, type);

		const i = filePath.indexOf("{}");
		if (i === -1)
			throw new Error("A CustomLoginFileHandler was called with a path that didn't have a spot marked with {}");

		
		/**
		 * The local path of the file (without parsing)
		 * @type {String}
		 */
		this.basePath = filePath;
		
		/**
		 * The local path of the guest file (served to viewers, who aren't logged in)
		 * @type {String}
		 */
		this.guestPath = path.join(basePath, "public", filePath.replace("{}", "guest"));
		
		/**
		 * The local path of the user file (served to logged in viewers)
		 * @type {String}
		 */
		this.userPath = path.join(basePath, "public", filePath.replace("{}", "user"));

		if (process.env.PRODUCTION && ["text/html", "text/css", "text/javascript"].includes(this.type)) {
			if (fs.existsSync(this.userPath + ".gz"))
				this.userContentGzip = fs.readFileSync(this.userPath + ".gz");
			if (fs.existsSync(this.guestPath + ".gz"))
				this.guestContentGzip = fs.readFileSync(this.guestPath + ".gz");
			
			if (fs.existsSync(this.userPath + ".br"))
				this.userContentBrotli = fs.readFileSync(this.userPath + ".br");
			if (fs.existsSync(this.guestPath + ".br"))
				this.guestContentBrotli = fs.readFileSync(this.guestPath + ".br");

			this.userContent = fs.readFileSync(this.userPath);
			this.guestContent = fs.readFileSync(this.guestPath);
		} else {
			this.userContent = fs.readFileSync(this.userPath);
			this.guestContent = fs.readFileSync(this.guestPath);
		}

		if (process.env.PRODUCTION) {
			this.userContentHash = md5(this.userContent);
			this.guestContentHash = md5(this.guestContent);
		}
	}

	async serve(req, res) {
		const split = await loginSplitter(req, res); // 0 if guest, 1 if user

		if (split === 0) {
			if (process.env.PRODUCTION) {
				res.setHeader("Cache-Control", `no-store`);
			}

			if (!req.headers["accept-encoding"]) {
				res.writeHead(200, {"Content-Type": this.type});
				res.end(this.guestContent);
			} else if (req.headers["accept-encoding"].indexOf("br") !== -1 && this.guestContentBrotli) {
				res.writeHead(200, {
					"Content-Type": this.type,
					"Content-Encoding": "br"
				});
				res.end(this.guestContentBrotli);
			} else if (req.headers["accept-encoding"].indexOf("gzip") !== -1 && this.guestContentGzip) {
				res.writeHead(200, {
					"Content-Type": this.type,
					"Content-Encoding": "gzip"
				});
				res.end(this.guestContentGzip);
			} else {
				res.writeHead(200, {"Content-Type": this.type});
				res.end(this.guestContent);
			}
		} else {
			if (process.env.PRODUCTION) {
				res.setHeader("Cache-Control", `no-store`);
			}

			if (!req.headers["accept-encoding"]) {
				res.writeHead(200, {"Content-Type": this.type});
				res.end(this.userContent);
			} else if (req.headers["accept-encoding"].indexOf("br") !== -1 && this.userContentBrotli) {
				res.writeHead(200, {
					"Content-Type": this.type,
					"Content-Encoding": "br"
				});
				res.end(this.userContentBrotli);
			} else if (req.headers["accept-encoding"].indexOf("gzip") !== -1 && this.userContentGzip) {
				res.writeHead(200, {
					"Content-Type": this.type,
					"Content-Encoding": "gzip"
				});
				res.end(this.userContentGzip);
			} else {
				res.writeHead(200, {"Content-Type": this.type});
				res.end(this.userContent);
			}
		}
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
			const fileHandlerList = JSON.parse(fs.readFileSync(path.join(basePath, "public", "files.json"))).map(f => {
				if (!f.customHandler)
					return new StaticFileHandler(f.url, f.type, f.path);
				
				switch (f.customHandler) {
					case "login-only":
						return new UserOnlyFileHandler(f.url, f.type, f.path);
					
					case "guest-only":
						return new GuestOnlyFileHandler(f.url, f.type, f.path);
					
					case "custom-login":
						return new CustomLoginFileHandler(f.url, f.type, f.path);
				
					default:
						throw new Error(`Unknown customHandler in files.json: ${f.customHandler}`);
				}
			});

			for (const fileHandler of fileHandlerList) {
				router.route(fileHandler.url).get((req, res) => fileHandler.serve(req, res));
			}

			// -- Special cases --

			// 404
			const notFoundPagePath = path.join(basePath, "public/404_page/404.html");
			const notFoundPage = fs.readFileSync(notFoundPagePath);
			let notFoundPageGzip, notFoundPageBrotli;

			if (fs.existsSync(notFoundPagePath + ".gz"))
				notFoundPageGzip = fs.readFileSync(notFoundPagePath + ".gz")
			
			if (fs.existsSync(notFoundPagePath + ".br"))
				notFoundPageBrotli = fs.readFileSync(notFoundPagePath + ".br")

			router.setFallback((req, res) => {
				if (!req.headers["accept-encoding"]) {
					res.writeHead(404, {"Content-Type": "text/html"});
					res.end(notFoundPage);
				} else if (req.headers["accept-encoding"].indexOf("br") !== -1 && notFoundPageBrotli) {
					res.writeHead(404, {
						"Content-Type": "text/html",
						"Content-Encoding": "br"
					});

					res.end(notFoundPageBrotli);
				} else if (req.headers["accept-encoding"].indexOf("gzip") !== -1 && notFoundPageGzip) {
					res.writeHead(404, {
						"Content-Type": "text/html",
						"Content-Encoding": "gzip"
					});

					res.end(notFoundPageGzip);
				} else {
					res.writeHead(404, {"Content-Type": "text/html"});
					res.end(notFoundPage.toString());
				}
			});

			// Robots.txt
			const robotsTxt = fs.readFileSync(path.join(basePath, "public/robots.txt"));
			router.route("/robots.txt").get((req, res) => {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(robotsTxt);
			});

			// Landing page
			router.route("/").getSplitter(loginSplitter,
			// User isn't logged in
			(req, res) => res.redirect("/home"),
			// User is logged in
			async (req, res) => {
				if (!req.showWatchlistByDefault) {
					res.redirect("/home");
				} else {
					res.redirect("/watchlist");
				}
			});
			
			// Logout
			router.route("/logout").post((req, res) => {
				res.setHeader("Set-Cookie", [
					router.genCookie("auth-token", "", {
						domain: process.env.domain,
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Lax",
						httpOnly: true,
						secure: true
					}),
					router.genCookie("username", "", {
						domain: process.env.domain,
						path: "/",
						expires: "Thu, 01 Jan 1970 00:00:00 GMT",
						sameSite: "Strict",
						secure: true
					})
				]);
				
				res.statusCode = 200;
				res.end();
			});	

			resolve();
		} catch (err) {
			reject(err);
		}
	});
};
