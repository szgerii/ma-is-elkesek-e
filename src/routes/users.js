const router = require("../private_modules/router.js");
const logger = require("../private_modules/logger");
const dbManager = require("../db_manager");
const jwt_verification = require("../middlewares/jwt_verification");

module.exports = () => {
	router.route("/api/login").post((req, res) => {
		dbManager.login(req.body.username, req.body.password).then(token => {
			res.writeHead(200, {
				"Content-Type": "application/json",
				"Set-Cookie": router.genCookie("auth-token", token, {
					domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
					path: "/",
					maxAge: 1800,
					sameSite: "Strict",
					httpOnly: true
				})
			});
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
						"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
					});
					res.end(router.genResponse("fail", {
						username: `No user was found with the following username: ${req.body.username}`
					}));
					break;
				
				case "InvalidPasswordError":
					res.writeHead(401, {
						"Content-Type": "application/json",
						"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
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

	router.route("/api/users").post((req, res) => {
		dbManager.createUser({
			username: req.body.username,
			password: req.body.password,
			showWatchlistByDefault: req.body.showWatchlistByDefault
		}).then(() => {
			logger.xlog(`Successfully registered new user: ${req.body.username}`);
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

	userRoute.delete((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
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

		dbManager.modifyUser(req.params.username, {
			username: req.body.username,
			password: req.body.password,
			showWatchlistByDefault: req.body.showWatchlistByDefault
		}).then(async () => {
			const token = await dbManager.genToken(req.body.username);
			res.writeHead(200, {
				"Content-Type": "application/json",
				"Set-Cookie": router.genCookie("auth-token", token, {
					domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
					path: "/",
					maxAge: 1800,
					sameSite: "Strict",
					httpOnly: true
				})
			});
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
	}, jwt_verification);
};