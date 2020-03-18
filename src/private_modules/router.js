const url = require("url");
const logger = require("./logger");

/**
 * @typedef {Object} IncomingMessage
 * @typedef {Object} ServerResponse
 */

/**
 * An array for storing every route the server should handle
 * @type {Route[]}
 */
const routes = [];

/**
 * An array of functions that are called before every request (to process the request object)
 * @type {function[]}
 */
const middlewares = [];

/**
 * A request handler that is called when no other route matches the request's path
 * @type {function}
 */
let fallback = (req, res) => {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end("404: Page not found");
};

/**
 * Class for representing the handler of a specific method inside a Route
 */
class Handler {
	constructor(requestHandler, ...middlewares) {
		this.requestHandler = requestHandler;
		this.middlewares = middlewares;
	}

	/**
	 * This function is responsible for processing a request and responding to it
	 * @param {IncomingMessage} req - the request object received from the client
	 * @param {ServerResponse} res - the response object that will be sent to the client
	 */
	handle(req, res) {
		this.requestHandler(req, res);
	}
}

/**
 * Class for handling a splitter
 */
class SplitHandler {
	constructor(splitter, ...requestHandlers) {
		this.splitter = splitter;
		this.requestHandlers = requestHandlers;
		this.middlewares = [];
	}

	/**
	 * This function is responsible for processing a request and responding to it
	 * @param {IncomingMessage} req - the request object received from the client
	 * @param {ServerResponse} res - the response object that will be sent to the client
	 */
	handle(req, res) {
		const result = this.splitter(req);

		if (result >= this.requestHandlers.length) {
			logger.error("The result of a splitter function pointed to a handler that wasn't provided.");
			res.writeHead(500, {"Content-Type": "text/html"});
			res.end("Belső hiba történt. Kérjük jelezd ezt a problémát a következő email címre: ma.is.elkesek.e@gmail.com");
		}

		this.requestHandlers[result](req, res);
	}
}

/**
 * Class for representing a route and its handlers
 */
class Route {
	/**
	 * @constructor
	 * @param {String} path - path of the route object 
	 */
	constructor(path) {
		this.path = path;
		
		/**
		 * An object containing the handlers, where the request handler of a certain method can be accessed by using the method as the key
		 * @type {Object.<String, (Handler | SplitHandler)>}
		 * @example handlers["GET"](req, res)
		 */
		this.handlers = {};
		
		/**
		 * An array of middleware functions that should be called before every request, regardless of its method
		 * @type {function[]}
		 */
		this.middlewares = [];
	}

	/**
	 * Adds a handler to the route object
	 * @param {String} method - the method for which this handler is responsible
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	addHandler(method, requestHandler, ...middlewares) {
		this.handlers[method.toUpperCase()] = new Handler(requestHandler, middlewares);
	}
	
	/**
	 * Shorthand for addHandler("GET", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	get(requestHandler, ...middlewares) {
		this.addHandler("GET", requestHandler, ...middlewares);
	}

	/**
	 * Shorthand for addHandler("POST", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	post(requestHandler, ...middlewares) {
		this.addHandler("POST", requestHandler, ...middlewares);
	}
	
	/**
	 * Shorthand for addHandler("PUT", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	put(requestHandler, ...middlewares) {
		this.addHandler("PUT", requestHandler, ...middlewares);
	}

	/**
	 * Shorthand for addHandler("DELETE", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	delete(requestHandler, ...middlewares) {
		this.addHandler("DELETE", requestHandler, ...middlewares);
	}

	/**
	 * Adds a handler to the route object, which will handle every request. Shorthand for addHandler("ALL", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	all(requestHandler, ...middlewares) {
		this.addHandler("ALL", requestHandler, ...middlewares);
	}

	/**
	 * Adds middleware function (or multiple middleware functions) to every method
	 * @param  {...function} middlewares - middleware function(s) that should be added to the route
	 */
	addMiddleware(...middlewares) {
		this.middlewares.push(...middlewares);
	}
	
	/**
	 * Adds middleware function (or multiple middleware functions) to a specified method
	 * @param {(String | String[])} method - name of the method which the middleware should be added to or an array of method names
	 * @param  {...function} middlewares - middleware function(s) that should be added to the method(s)
	 * @todo check which one's faster: instanceof or constructor.name === "something"
	 */
	addMiddlewareToMethod(method, ...middlewares) {
		if (method instanceof Array) {
			for (let i = 0; i < method.length; i++) {
				this.handlers[method[i]].middlewares.push(...middlewares);
			}
		} else {
			this.handlers[method].middlewares.push(...middlewares);
		}
	}

	/**
	 * Adds a splitter to a method
	 * @param {String} method - name of the method which the splitter should be added to or an array of method names
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	addSplitter(method, splitter, ...requestHandlers) {
		if (method instanceof Array) {
			for (let i = 0; i < method.length; i++) {
				this.handlers[method[i]] = new SplitHandler(splitter, ...requestHandlers);
			}
		} else {
			this.handlers[method] = new SplitHandler(splitter, ...requestHandlers);
		}
	}

	/**
	 * Shorthand for addSplitter("GET", ...)
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	getSplitter(splitter, ...requestHandlers) {
		this.addSplitter("GET", splitter, ...requestHandlers);
	}
	
	/**
	 * Shorthand for addSplitter("POST", ...)
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	postSplitter(splitter, ...requestHandlers) {
		this.addSplitter("POST", splitter, ...requestHandlers);
	}

	/**
	 * Shorthand for addSplitter("PUT", ...)
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	putSplitter(splitter, ...requestHandlers) {
		this.addSplitter("PUT", splitter, ...requestHandlers);
	}

	/**
	 * Shorthand for addSplitter("DELETE", ...)
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	deleteSplitter(splitter, ...requestHandlers) {
		this.addSplitter("DELETE", splitter, ...requestHandlers);
	}
}

/**
 * Finds a route by its path or (optionally) creates a new one if it doesn't exist
 * @param {String} path - path of the route
 * @param {Boolean} [createNew=true] - enables creating a new Route object if the search didn't yield any results
 * @returns {?Route} The route with the specified path, or null if the search was unsuccessful and the createNew argument was set to false
 * @todo implement alphabetical sorting in the 'routes' array and change this linear search to binary search
 */
exports.route = (path, createNew) => {
	for (let i = 0; i < routes.length; i++) {
		if (routes[i].url === path)
			return routes[i];
	}

	if (createNew === false)
		return null;

	const route = new Route(path);
	routes.push(route);
	return route;
};

/**
 * Function used for enabling common middlewares
 * @param {Boolean} useBodyParser - use the body parsing middleware
 * @param {Boolean} useCookieParser - use the cookie parsing middleware
 * @param {Boolean} useQueryParser - use the query parsing middleware
 */
exports.init = (useBodyParser, useCookieParser, useQueryParser) => {
	if (useBodyParser)
		this.addMiddleware(this.bodyParser);
	if (useCookieParser)
		this.addMiddleware(this.cookieParser);
	if (useQueryParser)
		this.addMiddleware(this.queryParser);
};

/**
 * The master request handling function which finds the appropriate route and handler for the specified request
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object which will be sent to the client as a response
 * @todo implement function
 */
exports.requestHandler = (req, res) => {
	const splitReqPath = url.parse(req.url).pathname.split("/");

	req.ip = (req.headers["x-forwarded-for"] || "").split(",").pop() ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;

	logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
		
	res.on("finish", () => {
		logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
	});

	for (let i = 0; i < middlewares.length; i++) {
		if (middlewares[i](req, res) === -1)
			return;
	}

	for (let i = 0; i < routes.length; i++) {
		if (!routes[i].handlers.includes(req.method.toUpperCase()))
			continue;

		const splitRoutePath = routes[i].split("/"), temp = {};
		let result = true;

		for (let j = 0; j < splitReqPath.length; j++) {
			if (splitRoutePath[j] === "*")
				break;

			if (splitRoutePath[j][0] === '{' && splitRoutePath[splitRoutePath.length - 1][1] === '}') {
				temp[splitRoutePath[j].slice(1, splitRoutePath[j].length - 1)] = splitReqPath[j];
				continue;
			}

			if (splitReqPath[j] !== splitRoutePath[j]) {
				result = false;
				break;
			}
		}

		if (result) {
			req.params = temp;

			for (let j = 0; j < routes[i].middlewares.length; j++) {
				if (routes[i].middlewares[i](req, res) === -1)
					return;
			}

			const handler = routes[i].handlers[req.method.toUpperCase()];
			for (let j = 0; j < handler.middlewares.length; j++) {
				if (handler.middlewares[i](req, res) === -1)
					return;
			}

			handler.handle(req, res);
			return;
		}
	}

	if (fallback)
		fallback(req, res);
};

/**
 * Adds middleware function (or multiple middleware functions) to every route
 * @param  {...function} middlewares - middleware function(s) that should be added to the router
 */
exports.addMiddleware = (...middlewares) => {
	this.middlewares.push(...middlewares);
}

/**
 * @param {function} handler - the function which should be called if no other route matches the request's path
 */
exports.setFallback = handler => {
	fallback = handler;
}

// -------------------
// |   MIDDLEWARES   |
// -------------------

/**
 * Body parsing middleware
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @returns {?Number} -1 on failure
 * @todo function implementation
 */
exports.bodyParser = (req, res) => {
	
}

/**
 * Cookie parsing middleware
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @returns {?Number} -1 on failure
 * @todo test middleware
 */
exports.cookieParser = (req, res) => {
	function reportInvalidSyntax() {
		res.writeHead(400, {"Content-Type": "text/html"});
		res.end("400 Bad Request: Malformed cookie syntax");
		return -1;
	}

	const cookies = {};

	if (!req.headers.cookie) {
		req.cookies = {};
		return;
	}

	const cookieString = req.headers.cookie, keyBuffer = "", valueBuffer = "", readingKey = true;
	
	for (let i = 0; i < cookieString.length; i++) {
		if (cookieString[i] === "=") {
			if (keyBuffer === "")
				return reportInvalidSyntax();
			
			readingKey = false;
			continue;
		}

		if (cookieString[i] === ";") {
			if (valueBuffer === "")
				return reportInvalidSyntax();

			cookies[keyBuffer] = Number.isInteger(valueBuffer) ? Number(valueBuffer) : 
								 valueBuffer === "true" ? true :
								 valueBuffer === "false" ? false :
								 valueBuffer;
			keyBuffer = "";
			valueBuffer = "";
			readingKey = true;			

			i++;
			continue;
		}
		
		if (readingKey)
			keyBuffer += cookieString[i];
		else
			valueBuffer += cookieString[i];
	}

	req.cookies = cookies;
}

/**
 * Query parsing middleware
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @returns {?Number} -1 on failure
 * @todo test middleware
 */
exports.queryParser = (req, res) => {
	function reportInvalidSyntax() {
		res.writeHead(400, {"Content-Type": "text/html"});
		res.end("400 Bad Request: Malformed query syntax");
		return -1;
	}

	const query = {};
	const queryString = req.url.slice(req.url.indexOf("?") + 1);

	let keyBuffer = "", valueBuffer = "", readingKey = true;
	for (let i = 0; i < queryString.length; i++) {
		if (queryString[i] === "=") {
			if (keyBuffer === "")
				return reportInvalidSyntax();

			readingKey = false;
			continue;
		}

		if (queryString[i] === "&" || queryString[i] === ";") {
			if (keyBuffer === "")
				return reportInvalidSyntax();

			query[keyBuffer] = Number.isInteger(valueBuffer) ? Number(valueBuffer) : 
							   valueBuffer === "true" || valueBuffer === "" ? true :
							   valueBuffer === "false" ? false :
							   valueBuffer;

			keyBuffer = "";
			valueBuffer = "";
			readingKey = true;
			continue;
		}

		if (queryString[i] === "%") {
			const hex = `${queryString[i + 1]}${queryString[i + 2]}`;
			if (!(/^([0-9a-fA-F]){2,2}$/.test(hex))) // TODO: check if this works without the additional paranthesis (syntax highlighting break without these)
				return reportInvalidSyntax();

			const charCode = Number(`0x${hex}`);
			
			if (readingKey)
				keyBuffer += String.fromCharCode(charCode);
			else
				valueBuffer += String.fromCharCode(charCode);

			i += 2;
			continue;
		}
		
		if (readingKey)
			keyBuffer += queryString[i];
		else
			valueBuffer += queryString[i];
	}

	req.query = query;
}

// -----------------
// |   UTILITIES   |
// -----------------

/**
 * Generates a JSend response
 * @param {String} status - the status property of the message (success, fail, error)
 * @param {?(Object | String)} data - the data (or message, if the status is error) property of the message
 * @returns {String} the generated message
 */
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

/**
 * Generates a cookie string
 * @param {String} key - key/name of the cookie
 * @param {String} value - value of the cookie
 * @param {?Object} options - the extra options which the cookie should have
 * @returns {String} the parsed cookie string
 */
exports.genCookie = (key, value, options) => {
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