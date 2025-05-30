const https = require("https");

const router = require("../../private_modules/router.js");
const logger = require("../../private_modules/logger");
const dbManager = require("../db_manager");
const jwt_verification = require("../middlewares/jwt_verification");

function verifyCaptcha(responseToken) {
	return new Promise((resolve, reject) => {
		const data = `response=${responseToken}&secret=${process.env.recaptchaSecretKey}`;

		const options = {
			hostname: "google.com",
			path: "/recaptcha/api/siteverify",
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": data.length
			}
		};

		let recaptchaResponse = "";
		const recaptchaRequest = https.request(options, response => {
			response.on("data", d => {
				recaptchaResponse += d;
			});

			response.on("end", () => {
				resolve(JSON.parse(recaptchaResponse).success);
			});
		});

		recaptchaRequest.on('error', error => {
			logger.error(error);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while validating reCAPTCHA"));

			reject();
		});

		recaptchaRequest.end(data);
	});
}

/**
 * Sets up the user routes
 */
module.exports = () => {
	router.route("/api/login").post((req, res) => {
		if (!req.body.username) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: "A username property is required to log in"
			}));
			return;
		}

		if (!req.body.password) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				"password": "A password property is required to log in"
			}));
			return;
		}

		dbManager.login(req.body.username, req.body.password).then(token => {
			res.setHeader("Set-Cookie", [
				router.genCookie("auth-token", token, {
					domain: process.env.domain,
					path: "/",
					maxAge: process.env.authTokenMaxAge,
					sameSite: "Lax",
					httpOnly: true,
					secure: true
				}),
				router.genCookie("username", req.body.username, {
					domain: process.env.domain,
					path: "/",
					maxAge: process.env.authTokenMaxAge,
					sameSite: "Strict",
					secure: true
				})
			]);
			res.setHeader("Content-Type", "text/html");
			res.statusCode = 200;
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "ValidationError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", err.data));
					break;

				case "InvalidUsernameError":
					res.writeHead(401, {
						"Content-Type": "application/json",
						"WWW-Authenticate": `Bearer realm="Access to ${req.method} ${req.url}"`
					});
					res.end(router.genResponse("fail", {
						username: `No user was found with the following username: ${req.body.username}`
					}));
					break;
				
				case "InvalidPasswordError":
					res.writeHead(401, {
						"Content-Type": "application/json",
						"WWW-Authenticate": `Bearer realm="Access to ${req.method} ${req.url}"`
					});
					res.end(router.genResponse("fail", {
						password: `Incorrect password`
					}));
					break;
			
				default:
					logger.error("An error occured while trying to log in a user");
					logger.xlog(err);
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't login user"));
					break;
			}
		});
	});

	router.route("/api/users").post(async (req, res) => {
		if (typeof req.body.recaptchaResponseToken !== "string" || req.body.recaptchaResponseToken === "") {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				recaptchaResponseToken: "Missing field from request body: recaptchaResponseToken"
			}));
			return;
		}

		const captchaResult = await verifyCaptcha(req.body.recaptchaResponseToken).catch(err => {
			logger.error(err);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while validating reCAPTCHA"));
		});

		if (captchaResult !== true) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while validating reCAPTCHA"));
			return;
		}

		dbManager.createUser({
			username: req.body.username,
			password: req.body.password,
			showWatchlistByDefault: req.body.showWatchlistByDefault,
			watchlistTime: req.body.watchlistTime
		}).then(async () => {
			return await dbManager.genToken(req.body.username);
		}).then(token => {
			res.setHeader("Set-Cookie", [
				router.genCookie("auth-token", token, {
					domain: process.env.domain,
					path: "/",
					maxAge: process.env.authTokenMaxAge,
					sameSite: "Lax",
					httpOnly: true,
					secure: true
				}),
				router.genCookie("username", req.body.username, {
					domain: process.env.domain,
					path: "/",
					maxAge: process.env.authTokenMaxAge,
					sameSite: "Strict",
					secure: true
				})
			]);
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "ValidationError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", err.data));
					break;
				
				case "UserAlreadyExistsError":
					res.writeHead(409, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						username: err.message
					}));
					break;
				
				case "InformationMissingError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", err.data));
					break;
				
				default:
					logger.error("Couldn't add user to the database");
					logger.error(err);
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't add user to the database"));
					break;
			}
		});
	});

	const userRoute = router.route("/api/users/{username}");

	userRoute.get((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}
		
		dbManager.getUserSettings(req.username).then(settings => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", settings));
		}).catch(err => {
			switch (err.name) {
				case "InvalidUsernameError":
					res.writeHead(404, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						username: `A user with the following username doesn't exist: ${req.username}`
					}));
					break;
			
				default:
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't get the user's settings"));
					break;
			}
		});
	}, jwt_verification);

	userRoute.delete(async (req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		if (!req.body.password) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				"password": "The current password of the user is required to delete their account."
			}));
			return;
		}

		const passwordCorrect = await dbManager.checkPassword(req.username, req.body.password);
		if (!passwordCorrect) {
			res.writeHead(401, {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer realm="Access to ${req.method} ${req.url}"`
			});
			res.end(router.genResponse("fail", {
				password: "The specified verification password is incorrect"
			}));
			return;
		}

		dbManager.deleteUser(req.params.username).then(() => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "InvalidUsernameError":
					res.writeHead(404, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						username: err.message
					}));
					break;
			
				default:
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't delete user from the database"));
					break;
			}
		});
	}, jwt_verification);

	userRoute.put((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		if (!req.body.password) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				"password": "The current password of the user is required to make any change to their account."
			}));
			return;
		}

		dbManager.checkPassword(req.params.username, req.body.password).then(isPasswordCorrect => {
			if (!isPasswordCorrect) {
				res.writeHead(401, {
					"Content-Type": "application/json",
					"WWW-Authenticate": `Bearer realm="Access to ${req.method} ${req.url}"`
				});
				res.end(router.genResponse("fail", {
					password: "The specified verification password is incorrect"
				}));
				return;
			}

			dbManager.modifyUser(req.params.username, {
				username: req.body.username,
				password: req.body.newPassword,
				showWatchlistByDefault: req.body.showWatchlistByDefault,
				watchlistTime: req.body.watchlistTime
			}).then(async () => {
				const token = await dbManager.genToken(req.body.username || req.params.username);
				res.setHeader("Set-Cookie", [
					router.genCookie("auth-token", token, {
						domain: process.env.domain,
						path: "/",
						maxAge: process.env.authTokenMaxAge,
						sameSite: "Lax",
						httpOnly: true,
						secure: true
					}),
					router.genCookie("username", req.body.username || req.params.username, {
						domain: process.env.domain,
						path: "/",
						maxAge: process.env.authTokenMaxAge,
						sameSite: "Strict",
						secure: true
					})
				]);
				res.writeHead(200, {"Content-Type": "application/json"});
				res.end(router.genResponse("success", null));
			}).catch(err => {
				switch (err.name) {
					case "InvalidUsernameError":
						res.writeHead(404, {"Content-Type": "application/json"});
						res.end(router.genResponse("fail", {
							username: err.message
						}));
						break;
					
					case "ValidationError":
						res.writeHead(422, {"Content-Type": "application/json"});
						res.end(router.genResponse("fail", err.data));
						break;
					
					case "UserAlreadyExistsError":
						res.writeHead(409, {"Content-Type": "application/json"});
						res.end(router.genResponse("fail", {
							username: err.message
						}));
						break;
	
					default:
						res.writeHead(500, {"Content-Type": "application/json"});
						res.end(router.genResponse("error", "Couldn't modify user in the database"));
						break;
				}
			});
		}).catch(err => {
			if (err.name === "UserNotFoundError") {
				res.writeHead(404, {"Content-Type": "application/json"});
				res.end(router.genResponse("fail", {
					username: "Couldn't find a user with the specified username"
				}));
			} else {
				res.writeHead(500, {"Content-Type": "application/json"});
				res.end(router.genResponse("error", "Couldn't modify user in the database"));
			}
	});
	}, jwt_verification);
};