const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const logger = require("./private_modules/logger");

// Mongoose models
const sectionModel = require("./models/section");
const userModel = require("./models/user");

const DB_REFRESH_INTERVAL = 30000; // milliseconds
let hotsmokinList = {}; // Top 5 section list (hotsmokin)
let lastDBCheck; // Last time the top 5 list was refreshed from the database

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

exports.getHotSmokin = () => {
	return new Promise((resolve, reject) => {
		if (!lastDBCheck || Date.now() - lastDBCheck > DB_REFRESH_INTERVAL || hotsmokinList.length !== 5) {
			updateHotSmokin().then(() => {
				logger.xlog("Successfully refreshed hotsmokin list from database");
				resolve(hotsmokinList);
			}).catch(err => {
				reject(err);
			});
			
			lastDBCheck = Date.now();
		} else {
			logger.xlog(`Responding with cached hotsmokin list, ${DB_REFRESH_INTERVAL - (Date.now() - lastDBCheck)} ms before next update`);
			resolve(hotsmokinList);
		}
	});
};

function updateHotSmokin() {
	return new Promise((resolve, reject) => {
		hotsmokinList = [];
		
		sectionModel.find({}).sort("-count").limit(5).exec((err, secs) => {
			if (err) {
				reject(err);
			}

			for (let i = 0; i < 5; i++) {
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

function validateUsername(username) {
	return /^([a-zA-Z0-9_-]){3,16}$/.test(username);
}

function validatePassword(password) {
	return password.length >= 6;
}

function validateBKKId(id) {
	return id.startsWith("BKK_");
}

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

		if (userData.showWatchlistByDefault === undefined)
			userData.showWatchlistByDefault = true;

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

exports.genToken = username => {
	return Promise.resolve(jwt.sign({ sub: username }, process.env.jwtKey, { expiresIn: "30m" }));
};

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
			showWatchlistByDefault: user.showWatchlistByDefault
		});
	});
};

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

		if (dataCheck.username || dataCheck.password || dataCheck.showWatchlistByDefault) {
			const err = new Error("A field from the request body had invalid formatting");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify user in the database");
			logger.xlog(err);
			reject(err);
		});
	});
};

exports.getWatchlist = username => {
	return new Promise(async (resolve, reject) => {
		const user = await userModel.findOne({ username: username });
		
		if (!user) {
			const err = new Error(`Couldn't find user with the following username: ${username}`);
			err.name = "InvalidUsernameError";
			reject(err);
			return;
		}

		sectionModel.populate(user, "watchlist").then(popUser => {
			resolve(popUser.watchlist.map(sec => {
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
					}
				};
			}));
		}).catch(err => {
			logger.error("Couldn't get user from the database");
			logger.xlog(err);
			reject(err);
			return;
		});
	});
};

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

		if (user.watchlist.includes(sec._id)) {
			const err = new Error("That section is already in the user's watchlist");
			err.name = "AlreadyInWatchlistError";
			reject(err);
			return;
		} else {
			user.watchlist.push(sec._id);
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
			dataCheck.lineId = "line object was missing from the request body";
		}
		
		if (!sectionData.stop1Id) {
			dataCheck.stop1Id = "stop1 object was missing from the request body";
		}
		
		if(!sectionData.stop2Id) {
			dataCheck.stop2Id = "stop2 object was missing from the request body";
		}
		
		if (dataCheck.lineId || dataCheck.stop1Id || dataCheck.stop2Id) {
			const err = new Error("A field from the request body was missing");
			err.name = "ValidationError";
			err.data = dataCheck;
			reject(err);
			return;
		}

		let sec = await sectionModel.findOne({ lineId: sectionData.lineId, stop1Id: sectionData.stop1Id, stop2Id: sectionData.stop2Id });
		const i = sec ? user.watchlist.indexOf(sec._id) : -1;

		if (!sec || i === -1) {
			const err = new Error("That section is not in the user's watchlist");
			err.name = "NotInWatchlistError";
			reject(err);
			return;
		}

		user.watchlist.splice(i, 1);
		
		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify user in the database");
			logger.xlog(err);
			reject(err);
		});		
	});
};