const router = require("../private_modules/router.js");
const dbManager = require("../db_manager");
const jwt_verification = require("../middlewares/jwt_verification");

/**
 * Sets up the watchlist routes
 */
module.exports = () => {
	const watchlistRoute = router.route("/api/users/{username}/watchlist");

	watchlistRoute.get((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		dbManager.getWatchlist(req.username).then(watchlist => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", watchlist));
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
					res.end(router.genResponse("error", "Couldn't get the user's watchlist from the database"));
					break;
			}
		});
	}, jwt_verification);

	watchlistRoute.post((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		dbManager.addToWatchlist(req.username, {
			line: req.body.line,
			stop1: req.body.stop1,
			stop2: req.body.stop2
		}).then(() => {
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
				
				case "AlreadyInWatchlistError":
					res.writeHead(409, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						section: err.message
					}));
					break;

				case "ValidationError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", err.data));
					break;
			
				default:
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't add section to the user's watchlist"));
					break;
			}
		});
	}, jwt_verification);

	watchlistRoute.patch((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		dbManager.moveSectionInWatchlist(req.username, {
			lineId: req.body.lineId,
			stop1Id: req.body.stop1Id,
			stop2Id: req.body.stop2Id
		}, req.body.moveUp).then(() => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "NotInWatchlistError":
					res.writeHead(404, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						section: err.message
					}));
					break;
				
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
				
				case "AlreadyFirstError":
				case "AlreadyLastError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						section: err.message
					}));
					break;

				default:
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", `Couldn't move section ${moveUp ? "up" : "down"} in the user's watchlist`));
					break;
			}
		});
	}, jwt_verification);

	watchlistRoute.delete((req, res) => {
		if (req.username !== req.params.username) {
			res.writeHead(403, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				username: `The following user doesn't have access to this resource: ${req.username}`
			}));
			return;
		}

		dbManager.removeFromWatchlist(req.username, {
			lineId: req.body.lineId,
			stop1Id: req.body.stop1Id,
			stop2Id: req.body.stop2Id
		}).then(() => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "NotInWatchlistError":
					res.writeHead(404, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", {
						section: err.message
					}));
					break;
				
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

				default:
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "Couldn't remove section from the user's watchlist"));
					break;
			}
		});
	}, jwt_verification);
};