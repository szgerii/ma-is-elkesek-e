const https = require("https");

const router = require("../../private_modules/router.js");
const logger = require("../../private_modules/logger");

function sendRequest(path, query) {
	return new Promise((resolve, reject) => {
		const options = {
			hostname: "futar.bkk.hu",
			path: `/api/query/v1/ws/otp/api/where/${path}?${query}`,
			method: "GET",
		};

		let response = "";
		const request = https.request(options, res => {
			res.on("data", d => {
				response += d;
			});

			res.on("end", () => {
				resolve(response);
			});
		});

		request.on('error', reject);

		request.end(query);
	});
}

/**
 * Sets up the proxy routes
 */
module.exports = () => {
	router.route("/api/proxy/arrivals-and-departures-for-stop.json").get((req, res) => {
		if (!req.query["stopId"]) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				stopId: "stopId parameter is required"
			}));
			return;
		}

		if (!req.query["minutesBefore"]) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				stopId: "minutesBefore parameter is required"
			}));
			return;
		}

		sendRequest("arrivals-and-departures-for-stop.json", `stopId=${req.query.stopId}&minutesBefore=${req.query.minutesBefore}&minutesAfter=0&includeReferences=false`).then(data => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		}).catch(error => {
			logger.error(error);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while trying to get data from the BKK API"));
		});
	});

	router.route("/api/proxy/search.json").get((req, res) => {
		if (!req.query["query"]) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				query: "query parameter is required"
			}));
			return;
		}

		sendRequest("search.json", `query=${req.query.query}`).then(data => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		}).catch(error => {
			logger.error(error);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while trying to get data from the BKK API"));
		});
	});

	router.route("/api/proxy/route-details.json").get((req, res) => {
		if (!req.query["routeId"]) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				routeId: "routeId parameter is required"
			}));
			return;
		}

		sendRequest("route-details.json", `routeId=${req.query.routeId}`).then(data => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		}).catch(error => {
			logger.error(error);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while trying to get data from the BKK API"));
		});
	}); 

	router.route("/api/proxy/trip-details.json").get((req, res) => {
		if (!req.query["tripId"]) {
			res.writeHead(422, {"Content-Type": "application/json"});
			res.end(router.genResponse("fail", {
				routeId: "tripId parameter is required"
			}));
			return;
		}

		sendRequest("trip-details.json", `tripId=${req.query.tripId}&includeReferences=false`).then(data => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(data);
		}).catch(error => {
			logger.error(error);

			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(router.genResponse("error", "Error while trying to get data from the BKK API"));
		});
	});
};