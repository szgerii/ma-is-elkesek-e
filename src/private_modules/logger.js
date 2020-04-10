const fs = require('fs');

const options = {};
let fileOutputStream, fileOutputReady = false;

/**
 * Gets the current date and time in a specific format
 * @param {Boolean} space - use spaces to format the string
 */
function getCurrentTime(space) {
	const d = new Date();
	let day = d.getDate() < 10 ? `0${d.getDate()}` : d.getDate();
	let month = d.getMonth() + 1 < 10 ? `0${d.getMonth() + 1}` : d.getMonth() + 1;
	let hours = d.getHours() < 10 ? `0${d.getHours()}` : d.getHours();
	let minutes = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
	let seconds = d.getSeconds() < 10 ? `0${d.getSeconds()}` : d.getSeconds();
	if (space)
		return `${d.getFullYear()}.${month}.${day}. ${hours}:${minutes}:${seconds}`;
	else
		return `${d.getFullYear()}.${month}.${day}_${hours}:${minutes}:${seconds}`;
}

/**
 * Sets a logger property
 * @param {String} key - the key of the property
 * @param {String} value - the value of the property
 */
exports.set = (key, value) => {
	options[key] = value;

	if (key === "file-output" && value === true) {
		if (!options["file-output-dir"] || !options["file-output-name"]) {
			console.log(options);
			exports.force("LOGGER: File output path or file output name wasn't specified. File output has been turned off.");
			options["file-output"] = false;
			options["file-output-dir"] = null;
			options["file-output-name"] = null;
			return;
		}
		
		fileOutputStream = fs.createWriteStream(`${options["file-output-dir"]}/${options["file-output-name"]}-${getCurrentTime()}.log`);
		
		fileOutputStream.on("error", (err) => {
			fileOutputStream.close();
			exports.force(`LOGGER: An error occured while accessing the log file. File output has been turned off. Turn on verbose mode for more information.`);
			exports.log(`LOGGER: "${err}"`);
			options["file-output"] = false;
			options["file-output-dir"] = null;
			options["file-output-name"] = null;
		});

		fileOutputStream.on("open", () => {
			exports.write(`LOGGER: Writing to log file at '${fileOutputStream.path}'`);
			fileOutputReady = true;
		});
	}
};

/**
 * Gets the value of a logger property
 * @param {String} key - key of the property
 * @returns {String} - the value of the property
 */
exports.get = key => {
	return options[key];
};

/**
 * Forces a message to the console (the message will be displayed no matter what)
 * @param {String} message - the message that should be logged
 */
exports.force = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

/**
 * Writes a message to the console (every mode, except silent)
 * @param {String} message - the message that should be logged
 */
exports.write = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (!options["silent"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

/**
 * Logs a message to the console (verbose or x-verbose mode)
 * @param {String} message - the message that should be logged
 */
exports.log = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (options["verbose"] || options["x-verbose"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

/**
 * X-logs a message to the console (x-verbose mode only)
 * @param {String} message - the message that should be logged
 */
exports.xlog = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (options["x-verbose"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

/**
 * Errors a message to the console (the message will be displayed no matter what)
 * @param {String} message - the message that should be logged
 */
exports.error = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	console.error(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

/**
 * Prints an object to the console (verbose or x-verbose mode)
 * @param {Object} obj - the object that should be printed
 * @param {?String} message - a message that should be logged before the object
 */
exports.dir = (obj, message) => {
	if (options["verbose"] || options["x-verbose"]) {
		if (message) {
			console.log(`[${getCurrentTime(true)}] ${message}`);
			console.dir(obj);
		} else {
			console.log(`[${getCurrentTime(true)}]`);
			console.dir(obj);
		}
	}
};

/**
 * Prints an object to the console (x-verbose mode only)
 * @param {Object} obj - the object that should be printed
 * @param {?String} message - a message that should be logged before the object
 */
exports.xdir = (obj, message) => {
	if (options["x-verbose"]) {
		if (message) {
			console.log(`[${getCurrentTime(true)}] ${message}`);
			console.dir(obj);
		}
		else {
			console.log(`[${getCurrentTime(true)}]`);
			console.dir(obj);
		}
	}
};

/**
 * Closes the logger (turns off file output)
 */
exports.close = () => {
	if (fileOutputReady) {
		exports.log("LOGGER: Closing file stream...");
		fileOutputStream.end();	
		fileOutputReady = false;
		options["file-output"] = false;
		options["file-output-dir"] = null;
		options["file-output-name"] = null;
	}
};