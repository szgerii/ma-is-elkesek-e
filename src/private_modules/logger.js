const fs = require('fs');

const options = {};
let fileOutputStream, fileOutputReady = false;

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

exports.get = key => {
	return options[key];
};

exports.force = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

exports.write = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (!options["silent"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

exports.log = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (options["verbose"] || options["x-verbose"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

exports.xlog = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	if (options["x-verbose"])
		console.log(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

exports.error = (message) => {
	const msg = `[${getCurrentTime(true)}] ${message}`;
	console.error(msg);
	if (options["file-output"] && fileOutputReady)
		fileOutputStream.write(msg + "\n");
};

exports.dir = (obj, message) => {
	if (options["verbose"] || options["x-verbose"]) {
		if (message) {
			console.log(`[${getCurrentTime(true)}]`);
			console.dir(obj);
		} else {
			console.log(`[${getCurrentTime(true)}] ${message}`);
			console.dir(obj);
		}
	}
};

exports.xdir = (obj, message) => {
	if (options["x-verbose"]) {
		if (message) {
			console.log(`[${getCurrentTime(true)}]`);
			console.dir(obj);
		}
		else {
			console.log(`[${getCurrentTime(true)}] ${message}`);
			console.dir(obj);
		}
	}
};

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