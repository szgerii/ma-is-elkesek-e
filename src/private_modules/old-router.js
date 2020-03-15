const logger = require("./logger");

let middlewares = [];
let routes = [];
let fallback;

class Route {
    constructor(method, path, handler, middleware) {
		this.method = method;
        this.path = path;
        this.pathParts = path.split("/").filter(el => { return el.length !== 0; });
		this.handler = handler;
		this.middlewares = [];
		if (middleware)
			this.middlewares.push(middleware);
    }
}

class SplitRoute {
	constructor(method, path, splitter, handlers) {
		this.method = method;
        this.path = path;
        this.pathParts = path.split("/").filter(el => { return el.length !== 0; });
		this.splitter = splitter;
		this.handlers = handlers;
	}
}

exports.requestHandler = async (req, res) => {
	try {
		await parseReq(req);
	} catch (err) {
		logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
		
		res.on("finish", () => {
			logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
		});

		switch (err.name) {
			case "InvalidContentTypeError":
				res.writeHead(422, {"Content-Type": "application/json"});
				res.end(this.genResponse("fail",{
					header: `Invalid Content-Type in header: ${req.headers["content-type"]}`
				}));
				return;
			
			case "InvalidBodyError":
				res.writeHead(400, {"Content-Type": "application/json"});
				res.end(this.genResponse("fail", {
					body: "The server was unable to process the body of the request, probably due to malformed syntax"
				}));
				return;
		
			default:
				res.writeHead(500, {"Content-Type": "application/json"});
				res.end(this.genResponse(500, "Something went wrong while processing the request"));
				logger.error("Something went wrong while processing a request");
				logger.xlog(err);
				return;
		}
	}

	logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
		
	res.on("finish", () => {
		logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
	});

    for (const mw of middlewares) {
		const result = mw(req, res);
		if (result === -1)
			return;
	}

    for (const r of routes) {
        if (r.method.toUpperCase() === req.method.toUpperCase()) {
            let result = true, temp = {};

            if (r.pathParts.length !== req.urlParts.length)
                continue;

            for (let i = 0; i < r.pathParts.length; i++) {
                if (r.pathParts[i][0] === "{" && r.pathParts[i][r.pathParts[i].length - 1] === "}") {
                    temp[r.pathParts[i].slice(1, r.pathParts[i].length - 1)] = req.urlParts[i];
                } else if (r.pathParts[i] !== req.urlParts[i]) {
                    result = false;
                    break;
                }
            }

            if (result) {
				if (r.constructor === SplitRoute) {
					const splitResult = await r.splitter(req, res);
					if (splitResult >= r.handlers.length) {
						logger.error(`There was an error while processing a request at ${req.url}: splitter function referenced a handler that wasn't provided to the router`);
						res.writeHead(500, {"Content-Type": "text/html"});
						res.end("Belső hiba történt a kérésed feldolgozása közben. Kérlek jelentsd ezt a balesetet a következő email címre: ma.is.elkesek.e@gmail.com");
						return;
					}
					r.handlers[splitResult](req, res);
					return;
				} else {
					req.params = temp;
					if (r.middlewares.length > 0) {
						for (const mw of r.middlewares) {
							const result = await mw(req, res);
							if (result === -1)
								return;
						}
					}
					r.handler(req, res);
					return;
				}

            }
        }
    }

    if (fallback)
        fallback(req, res);
};

exports.addMiddleware = middleware => {
    middlewares.push(middleware);
};

exports.addHandler = (path, method, requestHandler, mv) => {
    routes.push(new Route(method, path, requestHandler, mv));
};

exports.addSplitHandler = function(path, method, splitter) {
	routes.push(new SplitRoute(method, path, splitter, Array.from(arguments).slice(3)));
}

exports.setFallback = requestHandler => {
    fallback = requestHandler;
};

exports.genResponse = (status, data) => {
	if (status === "error") {
		return JSON.stringify({
			"status": status,
			"message": data
		});
	}

	return JSON.stringify({
		"status": status,
		"data": data
	});
}

exports.cookieBuilder = (key, value, options) => {
	let c = `${key}=${value};`;
	
	if (options.domain !== undefined)
		c += ` Domain=${options.domain};`
	if (options.path !== undefined)
		c += ` Path=${options.path};`
	if (options.expires !== undefined)
		c += ` Expires=${options.expires};`
	if (options.maxAge !== undefined)
		c += ` Max-Age=${options.maxAge};`
	if (options.sameSite !== undefined)
		c += ` SameSite=${options.sameSite};`
	if (options.httpOnly)
		c += ` HttpOnly;`
	if (options.secure)
		c += ` Secure;`
	
	return c.substr(0, c.length - 1);
}

/*
	Fills up the request object with the base url (without queries) and a separate query object
	req: request object
*/
function parseReq(req) {
	return new Promise(async (resolve, reject) => {
		req.ip = (req.headers["x-forwarded-for"] || "").split(",").pop() ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;

		const urlParts = req.url.split("?");
		req.baseUrl = urlParts[0];
		req.urlParts = req.baseUrl.split("/").filter(el => { return el.length !== 0; });
		
		await parseCookies(req);
		try {
			await parseBody(req)
		} catch (err) {
			reject(err);
			return;	
		}
		
		if (!urlParts[1]) {
			resolve();
			return;
		}
		
		req.query = queryParser(urlParts[1]);
		resolve();
	});
}

/*
	Parses a query string into a query object
	rawQuery: the unparsed query string
	detectType: if true, the function converts the query values, if possible
*/
function queryParser(rawQuery, detectType) {
	const query = {};

	rawQuery.split("&").forEach(data => {
		const splitData = data.split("=");
		
		if (!detectType)
			query[splitData[0]] = splitData[1];
		else if (splitData[1] === "true")
			query[splitData[0]] = true;
		else if (splitData[1] === "false")
			query[splitData[0]] = false;
		else if (!Number.isNaN(Number(splitData[1])))
			query[splitData[0]] = Number(splitData[1]);
		else
			query[splitData[0]] = splitData[1];
	});

	return query;
}

/*
	Returns a promise that parses a requests body
	Resolves with the body object
*/
function parseBody(req) {
	return new Promise((resolve, reject) => {
		let data = [];
		
		req.on("data", chunk => {
			data.push(chunk);
		});
	
		req.on("end", () => {
			let body;

			if (!req.headers["content-type"]) {
				req.body = {};
				resolve();
				return;
			}

			switch (req.headers["content-type"].split(";")[0]) {
				case "application/x-www-form-urlencoded":
					body = queryParser(decodeURIComponent(data.concat().toString()), false);
					req.body = body;
					resolve();
					break;

				case "application/json":
					try {
						body = JSON.parse(data.concat().toString());
						req.body = body;
						resolve();
					} catch (error) {
						const err = new Error(`Invalid request body`);
						err.name = "InvalidBodyError";
						reject(err);
					}
					break;
				
				case null:
				case undefined:
					req.body = {};
					resolve();
					break;
				
				default:
					const err = new Error(`Invalid Content-Type header: ${req.headers["content-type"]}`);
					err.name = "InvalidContentTypeError";
					reject(err);
					break;
			}
		});
	});
}

function parseCookies(req) {
	return new Promise((resolve, reject) => {
		const cookies = {};

		if (req.headers.cookie) {
			for (const c of req.headers.cookie.split(";")) {
				const i = c.indexOf("=");
	
				let val = c.substring(i + 1).trim();
				val = val === "true" ? true : val === "false" ? false : val; // Check if the value is a bool
				
				cookies[c.substring(0, i).trim()] = val;
			}
		}

		req.cookies = cookies;
		resolve();
	});
}