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
		for (let i = 0; i < this.middlewares.length; i++) {
			const result = this.middlewares[i](req, res);
			if (result === -1)
				return;
		}

		this.requestHandler(req, res);
	}
}

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
			res.end("An error occured while processing your request. Please report this problem to ma.is.elkesek.e@gmail.com");
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
 * The master request handling function which finds the appropriate route and handler for the specified request
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object which will be sent to the client as a response
 * @todo implement function
 */
exports.requestHandler = (req, res) => {
	const {pathname} = url.parse(req.url);
};