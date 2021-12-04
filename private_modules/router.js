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
exports.routes = [];

/**
 * @description An array of functions that are called before every request (to process the request object)
 * @type {function[]}
 */
exports.middlewares = [];

/**
 * A request handler that is called when no other route matches the request's path
 * @type {function}
 */
let fallback = (req, res) => {
	res.writeHead(404, {"Content-Type": "text/html"});
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
	async handle(req, res) {
		const result = await this.splitter(req, res);

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
		this.handlers[method.toUpperCase()] = new Handler(requestHandler, ...middlewares);
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
	 * Shorthand for addHandler("PATCH", ...)
	 * @param {function} requestHandler - the function responsible for processing the request and sending a response
	 * @param  {...function} middlewares - function(s) that should be called before the requestHandler
	 */
	patch(requestHandler, ...middlewares) {
		this.addHandler("PATCH", requestHandler, ...middlewares);
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
	 */
	addMiddlewareToMethod(method, ...middlewares) {
		if (method.constructor.name === "Array") {
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
	 * Shorthand for addSplitter("PATCH", ...)
	 * @param {function} splitter - the splitter function which decides which requestHandler is called for a specific request
	 * @param  {...function} requestHandlers - a list of functions which handle the processing of a request in certain scenarios (decided by the splitter function)
	 */
	patchSplitter(splitter, ...requestHandlers) {
		this.addSplitter("PATCH", splitter, ...requestHandlers);
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
	for (let i = 0; i < this.routes.length; i++) {
		if (this.routes[i].path === path)
			return this.routes[i];
	}

	if (createNew === false)
		return null;

	const route = new Route(path);
	this.routes.push(route);
	return route;
};

/**
 * Enables common middlewares and other functionality
 * @param {Boolean} [useBodyParser=true] - use the body parsing middleware
 * @param {Boolean} [useCookieParser=true] - use the cookie parsing middleware
 * @param {Boolean} [useQueryParser=true] - use the query parsing middleware
 * @param {Boolean} [addRedirectToResponse=true] - add a redirect function to a response
 */
exports.setup = (useBodyParser, useCookieParser, useQueryParser, addRedirectToResponse) => {
	if (addRedirectToResponse !== false)
		this.addMiddleware(this.addRedirect);
	if (useBodyParser !== false)
		this.addMiddleware(this.bodyParser);
	if (useCookieParser !== false)
		this.addMiddleware(this.cookieParser);
	if (useQueryParser !== false)
		this.addMiddleware(this.queryParser);
};

/**
 * The master request handling function which finds the appropriate route and handler for the specified request
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object which will be sent to the client as a response
 */
exports.requestHandler = async (req, res) => {
	const splitReqPath = splitWithoutEmptyStrings(url.parse(req.url).pathname, "/");

	req.ip = (req.headers["x-forwarded-for"] || "").split(",").pop() ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress;

	logger.xlog(`${req.method} request at ${req.url} from ${req.ip}`);
	
	res.on("finish", () => {
		logger.xlog(`Sending ${res.statusCode} response to ${req.ip}`);
	});
	
	await execMiddlewares(this.middlewares, req, res);

	for (let i = 0; i < this.routes.length; i++) {
		if (!this.routes[i].handlers[req.method.toUpperCase()] === undefined)
			continue;

		const splitRoutePath = splitWithoutEmptyStrings(this.routes[i].path, "/"), temp = {};
		let result = true;

		for (let j = 0; j < splitReqPath.length; j++) {
			if (splitRoutePath[j] === "*")
				break;

			if (splitRoutePath[j] && splitRoutePath[j][0] === '{' && splitRoutePath[j][splitRoutePath[j].length - 1] === '}') {
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

			await execMiddlewares(this.routes[i].middlewares, req, res);
			await execMiddlewares(this.routes[i].handlers[req.method.toUpperCase()].middlewares, req, res);

			this.routes[i].handlers[req.method.toUpperCase()].handle(req, res);
			return;
		}
	}

	if (fallback)
		fallback(req, res);
};

/**
 * Executes a list of middlewares
 * @param {function[]} middlewares - the list of middlewares that should be called
 * @returns {Promise} - A promise which resolves if the middlewares have finished executing
 */
function execMiddlewares(middlewares, req, res) {
	return new Promise(resolve => {
		if (middlewares.length === 0)
			resolve();

		let i = 0;
		
		function callNext() {
			if (++i === middlewares.length) {
				resolve();
				return;
			}

			middlewares[i](req, res, callNext);	
		}
		
		middlewares[0](req, res, callNext);
	});
}

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
 * @param {function} done - the callback function the middleware calls once it's finished processing the request
 */
exports.bodyParser = (req, res, done) => {
	function reportInvalidSyntax() {
		res.writeHead(400, {"Content-Type": "text/html"});
		res.end("400 Hibás kérés: hibás a kérés törzsének szintaxisa");
	}

	const data = [];

	if (!req.headers["content-type"]) {
		req.body = {};
		done();
		return;
	}
	
	req.on("data", chunk => {
		data.push(chunk);
	});

	req.on("end", () => {
		let body = data.join(""), contentType = req.headers["content-type"], separatorIndex = contentType.indexOf(";");

		if (separatorIndex !== -1)
			contentType = contentType.slice(0, separatorIndex);

		switch (contentType) {
			case "application/x-www-form-urlencoded":
				req.body = parseQuery(body, true);
				if (req.body === null)
					return reportInvalidSyntax();
				
				break;
			
			case "application/json":
				try {
					req.body = JSON.parse(body);
				} catch (err) {
					return reportInvalidSyntax();
				}
				break;
			
			case undefined:
			case null:
				break;
		
			default:
				res.writeHead(415, {"Content-Type": "text/html"});
				res.end("415 Nem támogatott média típus: a szerver nem tudja feldolgozni a Content-Type fejlécben megadott típusú üzeneteket");
				return;
		}

		if (!req.body)
			req.body = {};

		done();
	});
}

/**
 * Cookie parsing middleware
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @param {function} done - the callback function the middleware calls once it's finished processing the request
 */
exports.cookieParser = (req, res, done) => {
	function reportInvalidSyntax() {
		res.writeHead(400, {"Content-Type": "text/html"});
		res.end("400 Rossz kérés: Hibás a kérés sütiket tároló szövegének a szintaxisa");
	}

	const cookies = {};

	if (!req.headers.cookie) {
		req.cookies = {};
		done();
		return;
	}

	const cookieString = req.headers.cookie;
	let keyBuffer = "", valueBuffer = "", readingKey = true;
	
	for (let i = 0; i < cookieString.length; i++) {
		if (cookieString[i] === "=") {
			if (keyBuffer === "")
				return reportInvalidSyntax();
			
			readingKey = false;
			continue;
		}

		if (cookieString[i] === ";") {
			if (keyBuffer === "")
				return reportInvalidSyntax();
			
			const num = Number(valueBuffer);

			cookies[keyBuffer] = valueBuffer === "true" ? true :
								 valueBuffer === "false" ? false :
								 !Number.isNaN(num) ? num :
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

	if (cookieString[cookieString.length - 1] !== ";") {
		if (valueBuffer === "" || keyBuffer === "")
			return reportInvalidSyntax();
	
		const num = Number(valueBuffer);

		cookies[keyBuffer] = valueBuffer === "true" ? true :
							 valueBuffer === "false" ? false :
							 !Number.isNaN(num) ? num :
							 valueBuffer;
	}


	req.cookies = cookies;
	done();
}

/**
 * Query parsing middleware
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @param {function} done - the callback function the middleware calls once it's finished processing the request
 */
exports.queryParser = (req, res, done) => {
	req.query = {};

	const separatorIndex = req.url.indexOf("?");
	if (separatorIndex === -1) {
		done();
		return;
	}
	
	const queryString = req.url.slice(separatorIndex + 1);
	const query = parseQuery(queryString, true);

	if (query === null) {
		res.writeHead(400, {"Content-Type": "text/html"});
		res.end("400 Rossz kérés: Hibás az URL-ben megadott lekérdési karakterlánc (query)");
		return;
	}

	req.query = query || {};
	done();
}

/**
 * Adds a redirect function to the response object
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @param {function} done - the callback function the middleware calls once it's finished processing the request
 */
exports.addRedirect = (req, res, done) => {
	res.redirect = path => {
		res.writeHead(302, {"Location": path});
		res.end();
	}
	
	done();
}

// -----------------
// |   UTILITIES   |
// -----------------

/**
 * Parses a query string into an object
 * @param {String} queryString - The raw query string the function parses into an object
 * @param {Boolean} convertValues - Determines if the function should convert numbers and booleans into their respective types or if it should just leave them as a string
 * @returns {?Object} the parsed query object, an empty object if queryString is an empty string, or null if there is a syntax problem in queryString
 */
function parseQuery(queryString, convertValues) {
	const query = {};

	let keyBuffer = "", valueBuffer = "", readingKey = true;
	for (let i = 0; i < queryString.length; i++) {
		if (queryString[i] === "=") {
			if (keyBuffer === "")
				return null;

			readingKey = false;
			continue;
		}

		if (queryString[i] === "&" || queryString[i] === ";") {
			if (keyBuffer === "")
				return null;

			if (convertValues) {
				const num = Number(valueBuffer);

				query[keyBuffer] = valueBuffer === "true" || valueBuffer === "" ? true :
								   valueBuffer === "false" ? false :
								   !Number.isNaN(num) ? num : 
								   valueBuffer;
			}
			else
				query[keyBuffer] = valueBuffer;

			keyBuffer = "";
			valueBuffer = "";
			readingKey = true;
			continue;
		}

		if (queryString[i] === "%") {
			const hex = `${queryString[i + 1]}${queryString[i + 2]}`;
			if (!(/^([0-9a-fA-F]){2,2}$/.test(hex)))
				return null;

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

	if (keyBuffer === "")
		return null;

	if (convertValues) {
		const num = Number(valueBuffer);

		query[keyBuffer] = valueBuffer === "true" || valueBuffer === "" ? true :
						   valueBuffer === "false" ? false :
						   !Number.isNaN(num) ? num : 
						   valueBuffer;
	}
	else
		query[keyBuffer] = valueBuffer;

	return query;
}

/**
 * Splits a string into an array, separating elements by the specified separator without adding an empty string in the beginning or the end
 * NOTE: This only works with single-letter separators
 * @param {String} data - the string that should be parsed into an array
 * @param {String} separator - the string which separates the elements
 * @returns {String[]} the array which the string was parsed into
 */
function splitWithoutEmptyStrings(data, separator) {
	const result = [];
	
	let buffer = "";
	for (let i = 0; i < data.length; i++) {
		if (data[i] === separator) {
			if (!(buffer === "" && (i === 0  || i === data.length - 1))) {
				result.push(buffer);
			}
			buffer = "";
		} else {
			buffer += data[i];
		}
	}

	if (buffer !== "")
		result.push(buffer);
	
	if (result.length === 0)
		result.push(data);

	return result;
}

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
