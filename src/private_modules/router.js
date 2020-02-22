const logger = require("./logger");

let middlewares = [];
let routes = [];
let fallback;

class Route {
    constructor(method, path, handler) {
        this.method = method;
        this.path = path;
        this.pathParts = path.split("/").filter(el => { return el.length !== 0; });
        this.handler = handler;
    }
}

exports.requestHandler = async (req, res) => {
	await parseReq(req);

    logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
	
	res.on("finish", () => {
		logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
	});

    middlewares.forEach(mw => {
        const result = mw(req, res);
        if (result === 1)
            return;
    });

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
                req.params = temp;
                r.handler(req, res);
                return;
            }
        }
    }

    if (fallback)
        fallback(req, res);
};

exports.use = middleware => {
    middlewares.push(middleware);
};

exports.addHandler = (path, method, requestHandler) => {
    routes.push(new Route(method, path, requestHandler));
};

exports.setFallback = requestHandler => {
    fallback = requestHandler;
};

/*
	Fills up the request object with the base url (without queries) and a separate query object
	req: request object
*/
function parseReq(req) {
	return new Promise(async (resolve, reject) => {
		const urlParts = req.url.split("?");
		req.baseUrl = urlParts[0];
		req.urlParts = req.baseUrl.split("/").filter(el => { return el.length !== 0; });
	
		req.ip = (req.headers["x-forwarded-for"] || "").split(",").pop() ||
				req.connection.remoteAddress ||
				req.socket.remoteAddress ||
				req.connection.socket.remoteAddress;
		
		parseBody(req).then(body => {
			req.body = body;
			if (!urlParts[1]) {
				resolve();
				return;
			}
			
			req.query = queryParser(urlParts[1]);
			resolve();
		});
		
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
			const body = queryParser(decodeURIComponent(data.concat().toString()), false);
			resolve(body);
		});
	});
}