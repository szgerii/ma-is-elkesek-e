const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const logger = require("../private_modules/logger");

// Mongoose models
const sectionModel = require("./models/section");
const userModel = require("./models/user");

const DB_REFRESH_INTERVAL = 30000; // milliseconds
let hotsmokinFetchInProgress = false; // Indicates whether or not the hotsmokin list is currently being updated
let hotsmokinList = {}; // Top 4 section list (hotsmokin)
let lastDBCheck; // Last time the top 4 list was refreshed from the database

/**
 * Connects to the database specified by process.env.databaseUrl
 */
exports.setup = () => {
	mongoose.connect(process.env.databaseUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
	.catch(err => {
		logger.error("Couldn't connect to the database. Shutting down...");
		logger.xlog(err);
		process.exit(1);
	});
	
	mongoose.connection.on("connected", () => {
		logger.log("Successfully connected to the database");
	});

	mongoose.connection.on("error", err => {
		logger.xlog(err);
		logger.error("Database connection was terminated. Shutting down...");
		process.exit(1);
	});
}

/**
 * Increases a section's count in the database
 * @param {Object} sectionData - data of the section that should be modified (line-stop1-stop2 id/name)
 * @return {Promise} - A promise that resolves if the update was successful
 */
exports.updateSection = sectionData => {
	return new Promise(async (resolve, reject) => {
		const dataCheck = {};

		if (!sectionData.line) {
			dataCheck.line = "line object was missing from the request body";
		}
		
		if (!sectionData.stop1) {
			dataCheck.stop1 = "stop1 object was missing from the request body";
		}
		
		if(!sectionData.stop2) {
			dataCheck.stop2 = "stop2 object was missing from the request body";
		}

		if (!dataCheck.line && (!sectionData.line.id || !validateBKKId(sectionData.line.id) || !sectionData.line.name)) {
			dataCheck.line = "line ID or name was missing from the request body, or the format was invalid";
		}
		
		if (!dataCheck.stop1 && (!sectionData.stop1.id || !validateBKKId(sectionData.stop1.id) || !sectionData.stop1.name)) {
			dataCheck.stop1 = "stop1 ID or name was missing from the request body, or the format was invalid";
		}
		
		if (!dataCheck.stop2 && (!sectionData.stop2.id || !validateBKKId(sectionData.stop2.id) || !sectionData.stop2.name)) {
			dataCheck.stop2 = "stop2 ID or name was missing from the request body, or the format was invalid";
		}
		
		if (dataCheck.line || dataCheck.stop1 || dataCheck.stop2) {
			const err = new Error("A field from the request body was missing");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		try {
			let sec = await sectionModel.findOne({ lineId: sectionData.line.id, stop1Id: sectionData.stop1.id, stop2Id: sectionData.stop2.id });
			
			if (sec) {
				sec.count++;
				await sec.save();
				logger.xlog(`Increased the following section's count in the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
				resolve();
			} else {
				sec = new sectionModel();
				sec.lineId = sectionData.line.id;
				sec.stop1Id = sectionData.stop1.id;
				sec.stop2Id = sectionData.stop2.id;
				sec.lineName = sectionData.line.name;
				sec.stop1Name = sectionData.stop1.name;
				sec.stop2Name = sectionData.stop2.name;
				sec.count = 1;
				await sec.save();
				logger.xlog(`Adding the following section to the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
				resolve();
			}
		} catch (err) {
			reject(err);
		}
	});
};

/**
 * Gets the hotsmokin list either from cache or from the database if the cached data is outdated
 * @return {Promise} - A promise that resolves with the hotsmokin list if no error occured
 */
exports.getHotSmokin = () => {
	return new Promise((resolve, reject) => {
		if (!hotsmokinFetchInProgress && (!lastDBCheck || Date.now() - lastDBCheck > DB_REFRESH_INTERVAL || hotsmokinList.length !== 4)) {
			hotsmokinFetchInProgress = true;
			
			updateHotSmokin().then(() => {
				logger.xlog("Successfully refreshed hotsmokin list from database");
				resolve(hotsmokinList);
			}).catch(err => {
				reject(err);
			});
			
			hotsmokinFetchInProgress = false;
			lastDBCheck = Date.now();
		} else {
			logger.xlog(`Responding with cached hotsmokin list, ${DB_REFRESH_INTERVAL - (Date.now() - lastDBCheck)} ms before next update`);
			resolve(hotsmokinList);
		}
	});
};

/**
 * Fetches the hotsmokin list from the database
 * @return {Promise} - A promise that resolves if no error occured
 */
function updateHotSmokin() {
	return new Promise((resolve, reject) => {
		hotsmokinList = [];
		
		sectionModel.find({}).sort("-count").limit(4).exec((err, secs) => {
			if (err) {
				reject(err);
				return;
			}

			for (let i = 0; i < 4; i++) {
				if (!secs[i])
					break;
				
				hotsmokinList.push({
					line: {
						id: secs[i].lineId,
						name: secs[i].lineName
					},
					stop1: {
						id: secs[i].stop1Id,
						name: secs[i].stop1Name
					},
					stop2: {
						id: secs[i].stop2Id,
						name: secs[i].stop2Name
					}
				});
			}

			resolve();
		});
	});
}

/**
 * Checks if the format of a username is valid or not
 * @param {String} username - the username that should be validated
 * @return {Boolean} - true if the username is valid, false otherwise 
 */
function validateUsername(username) {
	return /^([a-zA-Z0-9_-]){3,16}$/.test(username);
}

/**
 * Checks if the format of a password is valid or not
 * @param {String} password - the password that should be validated
 * @return {Boolean} - true if the password is valid, false otherwise 
 */
function validatePassword(password) {
	return password.length >= 6;
}

/**
 * Checks if the format of a BKK id is valid or not
 * NOTE: this only checks if the id starts with 'BKK_', the use of this function is discouraged if you need 100% verification that an object exists with that id in the BKK database 
 * @param {String} id - the id that should be validated
 * @return {Boolean} - true if the id is valid, false otherwise 
 */
function validateBKKId(id) {
	return id.startsWith("BKK_");
}

/**
 * Creates a user in the database
 * @param {Object} userData - data of the user that should be created (username, password, showWatchlistByDefault)
 * @return {Promise} - A promise that resolves if the user was successfully created
 */
exports.createUser = userData => {
	return new Promise(async (resolve, reject) => {
		const dataCheck = {};
		
		if (!userData.username) {
			dataCheck.username = "Missing field from request body: username"
		}
		if (!userData.password) {
			dataCheck.password = "Missing field from request body: password"
		}

		if (dataCheck.username || dataCheck.password) {
			const err = new Error("A necessary field was missing from the request body");
			err.name = "InformationMissingError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		if (!validateUsername(userData.username)) {
			dataCheck.username = `Invalid username format: ${userData.username}`;
		}

		if (!validatePassword(userData.password)) {
			dataCheck.password = `Invalid password format`;
		}

		if (dataCheck.username || dataCheck.password) {
			const err = new Error("A field from the request body had invalid formatting");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		if (userData.showWatchlistByDefault === undefined) {
			userData.showWatchlistByDefault = true;
		} else if (typeof userData.showWatchlistByDefault !== "boolean") {
			const err = new Error("A field in the request body had invalid value");
			err.name = "ValidationError";
			err.data = {
				"showWatchlistByDefault": `Invalid type: ${typeof userData.showWatchlistByDefault}, expected: boolean`
			};
			reject(err);
			return;
		}

		if (userData.watchlistLatency === undefined) {
			userData.watchlistLatency = 20;
		} else if (typeof userData.watchlistLatency !== "number") {
			const err = new Error("A field in the request body had invalid value");
			err.name = "ValidationError";
			err.data = {
				"watchlistLatency": `Invalid type: ${typeof userData.watchlistLatency}, expected: number`
			};
			reject(err);
			return;
		}

		if (await userModel.findOne({ username: userData.username })) {
			const err = new Error(`A user already exists with the following username: ${userData.username}`);
			err.name = "UserAlreadyExistsError";
			reject(err);
			return;
		}

		const user = new userModel();
		user.username = userData.username;
		user.email = userData.email;
		user.password = userData.password;
		user.showWatchlistByDefault = userData.showWatchlistByDefault;
		user.watchlistLatency = userData.watchlistLatency;
		user.hash = true;
		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't save user to the database");
			logger.xlog(err);
			reject(err);
		});
	});
};

/**
 * Checks if the password matches the account of username
 * @param {String} username - username of the user
 * @param {String} password - password that should be checked
 * @return {Promise} - A promise that resolves with true if the password is correct, or with false otherwise
 */
exports.checkPassword = (username, password) => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });

		if (!user) {
			const err = new Error("Couldn't find a user with that username");
			err.name = "UserNotFoundError";
			reject(err);
			return;
		}

		resolve(await user.checkPassword(password));
	});
}

/**
 * Gets an authentication token for a user
 * @param {String} username - username of the user
 * @param {String} password - password of the user
 * @return {Promise} - A promise that resolves with the token if the authentication was successful
 */
exports.login = (username, password) => {
	return new Promise(async (resolve, reject) => {
		const dataCheck = {};

		if (!username) {
			dataCheck.username = "Missing field from request body: username"
		} else if (!validateUsername(username)) {
			dataCheck.username = `Invalid username format: ${username}`
		}

		if (!password) {
			dataCheck.password = "Missing field from request body: password"
		} else if (!validatePassword(password)) {
			dataCheck.password = "Invalid password format"
		}
		
		if (dataCheck.username || dataCheck.password) {
			const err = new Error("A field from the request body was missing");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		const user = await userModel.findOne({ username: username });

		if (!user) {
			const err = new Error("The username was invalid or the user has been deleted");
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		user.checkPassword(password).then(async result => {
			if (result) {
				resolve(await this.genToken(username));
			} else {
				const err = new Error("The username was invalid or the user has been deleted");
				err.name = "InvalidPasswordError";
				reject(err);
			}
		}).catch(err => {
			reject(err);
		});
	});
}

/**
 * Generates an authentication JWT for a user
 * @param {String} username - username of the user
 * @return {String} - the token
 */
exports.genToken = username => {
	return Promise.resolve(jwt.sign({ sub: username }, process.env.jwtKey, { expiresIn: `${process.env.authTokenMaxAge}s` }));
};

/**
 * Deletes a user from the database
 * @param {String} username - username of the user
 * @return {Promise} - A promise that resolves if the deletion was successful
 */
exports.deleteUser = username => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		user.remove().then(resolve).catch(err => reject(err));
	});
};

/**
 * Gets the account settings of a user
 * @param {String} username - username of the user
 * @return {Promise} - A promise that resolves with a settings object (username, showWatchlistByDefault) if no error occured
 */
exports.getUserSettings = username => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		resolve({
			username: user.username,
			showWatchlistByDefault: user.showWatchlistByDefault,
			watchlistLatency: user.watchlistLatency
		});
	});
};

/**
 * Changes a user's settings in the database
 * @param {String} username - username of the user
 * @param {Object} modifications - properties that should be modified (username, password, showWatchlistByDefault)
 * @return {Promise} - A promise that resolves if the update was successful
 */
exports.modifyUser = (username, modifications) => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		const dataCheck = {};

		if (modifications.username !== undefined) {
			if (!validateUsername(modifications.username))
				dataCheck.username = `Invalid username value: ${modifications.username}`;
			else
				user.username = modifications.username;
		}

		if (modifications.password !== undefined) {
			if (!validatePassword(modifications.password)) {
				dataCheck.password = "Invalid password value";
			}
			else
				user.password = modifications.password;
		}

		if (typeof modifications.showWatchlistByDefault === "boolean")
			user.showWatchlistByDefault = modifications.showWatchlistByDefault;
		else if (modifications.showWatchlistByDefault !== undefined)
			dataCheck.showWatchlistByDefault = `Invalid showWatchlistByDefault value: ${modifications.showWatchlistByDefault}`;

		if (typeof modifications.watchlistLatency === "number")
			user.watchlistLatency = modifications.watchlistLatency;
		else if (modifications.watchlistLatency !== undefined)
			dataCheck.watchlistLatency = `Invalid watchlistLatency value: ${modifications.watchlistLatency}`;

		if (dataCheck.username || dataCheck.password || dataCheck.showWatchlistByDefault) {
			const err = new Error("A field from the request body had invalid formatting");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}
		
		if (await userModel.findOne({ username: modifications.username })) {
			const err = new Error(`A user already exists with the following username: ${modifications.username}`);
			err.name = "UserAlreadyExistsError";
			reject(err);
			return;
		}

		if (modifications.password)
			user.hash = true;

		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify user in the database");
			logger.xlog(err);
			reject(err);
		});
	});
};

/**
 * Fetches the watchlist of a user
 * @param {String} username - username of the user
 * @return {Promise} - A promise that resolves with the watchlist if no error occured
 */
exports.getWatchlist = username => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		sectionModel.populate(user.watchlist, "section").then(populatedList => {
			const watchlist = populatedList.map(item => {
				const sec = item.section;
				return {
					line: {
						id: sec.lineId,
						name: sec.lineName
					},
					stop1: {
						id: sec.stop1Id,
						name: sec.stop1Name
					},
					stop2: {
						id: sec.stop2Id,
						name: sec.stop2Name
					},
					orderIndex: item.orderIndex
				};
			});

			resolve({
				latency: user.watchlistLatency,
				list: watchlist
			});
		}).catch(err => {
			logger.error("Couldn't get user from the database");
			logger.xlog(err);
			reject(err);
			return;
		});
	});
};

/**
 * Adds a section to a user's watchlist
 * @param {String} username - username of the user
 * @param {Object} sectionData - data of the section that should be added to the watchlist (line-stop1-stop2 id/name)
 * @return {Promise} - A promise that resolves if the addition was successful
 */
exports.addToWatchlist = (username, sectionData) => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		const dataCheck = {};

		if (!sectionData.line) {
			dataCheck.line = "line object was missing from the request body";
		}
		
		if (!sectionData.stop1) {
			dataCheck.stop1 = "stop1 object was missing from the request body";
		}
		
		if(!sectionData.stop2) {
			dataCheck.stop2 = "stop2 object was missing from the request body";
		}

		if (!dataCheck.line && (!sectionData.line.id || !validateBKKId(sectionData.line.id) || !sectionData.line.name)) {
			dataCheck.line = "line ID or name was missing from the request body, or the format was invalid";
		}
		
		if (!dataCheck.stop1 && (!sectionData.stop1.id || !validateBKKId(sectionData.stop1.id) || !sectionData.stop1.name)) {
			dataCheck.stop1 = "stop1 ID or name was missing from the request body, or the format was invalid";
		}
		
		if (!dataCheck.stop2 && (!sectionData.stop2.id || !validateBKKId(sectionData.stop2.id) || !sectionData.stop2.name)) {
			dataCheck.stop2 = "stop2 ID or name was missing from the request body, or the format was invalid";
		}
		
		if (dataCheck.line || dataCheck.stop1 || dataCheck.stop2) {
			const err = new Error("A field from the request body was missing");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		let sec = await sectionModel.findOne({ lineId: sectionData.line.id, stop1Id: sectionData.stop1.id, stop2Id: sectionData.stop2.id });
		if (!sec) {
			sec = new sectionModel();
			sec.lineId = sectionData.line.id;
			sec.stop1Id = sectionData.stop1.id;
			sec.stop2Id = sectionData.stop2.id;
			sec.lineName = sectionData.line.name.replace(/\+/g, " ");
			sec.stop1Name = sectionData.stop1.name.replace(/\+/g, " ");
			sec.stop2Name = sectionData.stop2.name.replace(/\+/g, " ");
			sec.count = 1;
			await sec.save();
			logger.xlog(`Adding the following section to the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
		}

		let includesSection = false;

		for (let i = 0; i < user.watchlist.length; i++) {
			if (user.watchlist[i].section.equals(sec._id)) {
				includesSection = true;
				break;
			}
		}

		if (includesSection) {
			const err = new Error("That section is already in the user's watchlist");
			err.name = "AlreadyInWatchlistError";
			reject(err);
			return;
		} else {
			user.watchlist.push({
				section: sec._id,
				orderIndex: user.watchlist.length
			});
			user.save().then(() => {
				resolve();
			}).catch(err => {
				logger.error("Couldn't modify user in the database");
				logger.xlog(err);
				reject(err);
			});
		}
	});
};

/**
 * Moves a section up or down in a user's watchlist
 * @param {String} username - username of the user
 * @param {Object} sectionData - data of the section that should be moved (line-stop1-stop2 id)
 * @param {Boolean} moveUp - if true, the section will be moved higher, it will be moved lower otherwise
 * @return {Promise} - A promise that resolves if moving the section was successful
 */
exports.moveSectionInWatchlist = (username, sectionData, moveUp) => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		const dataCheck = {};

		if (!sectionData.lineId) {
			dataCheck.lineId = "line id was missing from the request body";
		}
		
		if (!sectionData.stop1Id) {
			dataCheck.stop1Id = "stop1 id was missing from the request body";
		}
		
		if(!sectionData.stop2Id) {
			dataCheck.stop2Id = "stop2 id was missing from the request body";
		}

		if (typeof moveUp !== "boolean") {
			dataCheck.moveUp = "moveUp was either missing from the request body or was not a boolean"
		}
		
		if (dataCheck.lineId || dataCheck.stop1Id || dataCheck.stop2Id || dataCheck.moveUp) {
			const err = new Error("A field from the request body was missing or had invalid formatting");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		const sec = await sectionModel.findOne({ lineId: sectionData.lineId, stop1Id: sectionData.stop1Id, stop2Id: sectionData.stop2Id });
		
		if (!sec) {
			const err = new Error("That section is not in the user's watchlist");
			err.name = "NotInWatchlistError";
			reject(err);
			return;
		}

		user.watchlist.sort((a, b) =>
			a.orderIndex < b.orderIndex ? -1 :
			a.orderIndex > b.orderIndex ? 1 : 0
		);

		let sectionIndex = -1;

		for (let i = 0; i < user.watchlist.length; i++) {
			if (user.watchlist[i].section.equals(sec._id)) {
				sectionIndex = i;
				break;
			}
		}

		if (sectionIndex === -1) {
			const err = new Error("That section is not in the user's watchlist");
			err.name = "NotInWatchlistError";
			reject(err);
			return;
		}

		if (moveUp) {
			if (sectionIndex === 0) {
				const err = new Error("The section is already the first one in the list");
				err.name = "AlreadyFirstError";
				reject(err);
				return;
			}

			user.watchlist[sectionIndex].orderIndex--;
			user.watchlist[sectionIndex - 1].orderIndex++;
		} else {
			if (sectionIndex === user.watchlist.length - 1) {
				const err = new Error("The section is already the last one in the list");
				err.name = "AlreadyLastError";
				reject(err);
				return;
			}

			user.watchlist[sectionIndex].orderIndex++;
			user.watchlist[sectionIndex + 1].orderIndex--;
		}

		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify watchlist in the database");
			logger.xlog(err);
			reject(err);
		});
	});
};

/**
 * Removes a section from a user's watchlist
 * @param {String} username - username of the user
 * @param {Object} sectionData - data of the section that should be removed (line-stop1-stop2 id)
 * @return {Promise} - A promise that resolves if the deletion was successful
 */
exports.removeFromWatchlist = (username, sectionData) => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		const dataCheck = {};

		if (!sectionData.lineId) {
			dataCheck.lineId = "line id was missing from the request body";
		}
		
		if (!sectionData.stop1Id) {
			dataCheck.stop1Id = "stop1 id was missing from the request body";
		}
		
		if(!sectionData.stop2Id) {
			dataCheck.stop2Id = "stop2 id was missing from the request body";
		}
		
		if (dataCheck.lineId || dataCheck.stop1Id || dataCheck.stop2Id) {
			const err = new Error("A field from the request body was missing");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		const sec = await sectionModel.findOne({ lineId: sectionData.lineId, stop1Id: sectionData.stop1Id, stop2Id: sectionData.stop2Id });
		
		if (!sec) {
			const err = new Error("That section is not in the user's watchlist");
			err.name = "NotInWatchlistError";
			reject(err);
			return;
		}

		user.watchlist.sort((a, b) =>
			a.orderIndex < b.orderIndex ? -1 :
			a.orderIndex > b.orderIndex ? 1 : 0
		);

		let sectionIndex = -1;

		for (let i = 0; i < user.watchlist.length; i++) {
			if (user.watchlist[i].section.equals(sec._id)) {
				sectionIndex = i;
				break;
			}
		}

		if (sectionIndex === -1) {
			const err = new Error("That section is not in the user's watchlist");
			err.name = "NotInWatchlistError";
			reject(err);
			return;
		}

		user.watchlist.splice(sectionIndex, 1);
		
		for (let i = sectionIndex; i < user.watchlist.length; i++) {
			user.watchlist[i].orderIndex = i;
		}

		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify watchlist in the database");
			logger.xlog(err);
			reject(err);
		});
	});
};
