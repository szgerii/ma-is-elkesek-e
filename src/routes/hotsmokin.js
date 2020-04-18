const router = require("../../private_modules/router.js");
const logger = require("../../private_modules/logger");
const dbManager = require("../db_manager");

const route = router.route("/api/hotsmokin");

/**
 * Sets up the hotsmokin routes
 */
module.exports = () => {
	dbManager.getHotSmokin().catch(err => {
		logger.error("Couldn't get top 3 list from database");
		logger.xlog(err);
	});

	route.get((req, res) => {
		dbManager.getHotSmokin().then(hotsmokinList => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", hotsmokinList));
		}).catch(err => {
			res.writeHead(500, {"Content-Type": "application/json"});
			res.end(router.genResponse("error", "Couldn't get top 5 sections from the database"));
			logger.error("Couldn't get top 5 list from database");
			logger.xlog(err);
		});
	});
	
	route.post((req, res) => {
		dbManager.updateSection({
			line: req.body.line,
			stop1: req.body.stop1,
			stop2: req.body.stop2
		}).then(() => {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(router.genResponse("success", null));
		}).catch(err => {
			switch (err.name) {
				case "InformationMissingError":
				case "ValidationError":
					res.writeHead(422, {"Content-Type": "application/json"});
					res.end(router.genResponse("fail", err.data));
					break;
			
				default:
					logger.error("Couldn't update a section in the database");
					logger.xlog(err);
					res.writeHead(500, {"Content-Type": "application/json"});
					res.end(router.genResponse("error", "We were unable to update the section in the database"));
					break;
			}
		});
	});
};