const mongoose = require("mongoose");
const logger = require("./private_modules/logger");

// Mongoose models
const sectionModel = require("./models/section");
const userModel = require("./models/user");

const DB_REFRESH_INTERVAL = 30000; // milliseconds
const top3 = {}; // Top 3 section list
let lastDBCheck; // Last time the top 3 list was refreshed from the database 

exports.connect = dbUrl => {
	return mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
};

exports.connection = mongoose.connection;

exports.updateSection = sectionData => {
	return new Promise(async (resolve, reject) => {
		const dataCheck = {};

		if (!sectionData.lineId || !sectionData.lineName) {
			dataCheck.line = "Line information missing";
		}
		if (!sectionData.stop1Id || !sectionData.stop1Name) {
			dataCheck.stop1 = "Stop1 information missing";
		}
		if (!sectionData.stop2Id || !sectionData.stop2Name) {
			dataCheck.stop2 = "Stop2 information missing";
		}

		if (dataCheck.line || dataCheck.stop1 || dataCheck.stop2) {
			const err = new Error("A necessary field was missing from the request body");
			err.name = "InformationMissingError";
			err.data = dataCheck;
			reject(err);
		}

		try {
			let sec = await sectionModel.findOne({ lineId: sectionData.lineId, stop1Id: sectionData.stop1Id, stop2Id: sectionData.stop2Id });
			
			if (sec) {
				sec.count++;
				await sec.save();
				logger.xlog(`Increased the following section's count in the database -> ${sec.lineName}: ${sec.stop1Name} - ${sec.stop2Name}`);
				resolve();
			} else {
				sec = new sectionModel();
				sec.lineId = sectionData.lineId;
				sec.stop1Id = sectionData.stop1Id;
				sec.stop2Id = sectionData.stop2Id;
				sec.lineName = sectionData.lineName.replace(/\+/g, " ");
				sec.stop1Name = sectionData.stop1Name.replace(/\+/g, " ");
				sec.stop2Name = sectionData.stop2Name.replace(/\+/g, " ");
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

/*
	Returns a promise that checks if the top 3 list should be updated and
		a) calls the update function if necessary, and resolves with the top 3 list
		b) resolves the top 3 list if update isn't necessary
		c) rejects with the error if something went wrong
*/
exports.getHotSmokin = () => {
	return new Promise((resolve, reject) => {
		if (!lastDBCheck || Date.now() - lastDBCheck > DB_REFRESH_INTERVAL || !top3.hot1 || !top3.hot2 || !top3.hot3) {
			updateHotSmokin().then(() => {
				logger.xlog("Successfully refreshed top 3 section from database");
				resolve(top3);
			}).catch(err => {
				reject(err);
			});
			
			lastDBCheck = Date.now();
		} else {
			logger.xlog(`Responding with cached top 3 list, ${DB_REFRESH_INTERVAL - (Date.now() - lastDBCheck)} ms before next update`);
			resolve(top3);
		}
	});
};

/*
	Returns a promise that updates the top 3 hot smokin section from the database and
		a) resolves if the update was successful
		b) rejects with the error if something went wrong
*/
function updateHotSmokin() {
	return new Promise((resolve, reject) => {
		top3.hot1 = null;
		top3.hot2 = null;
		top3.hot3 = null;
		
		sectionModel.find({}).sort("-count").limit(3).exec((err, secs) => {
			if (err) {
				reject(err);
			}

			if (secs.length >= 1) {
				top3.hot1 = {
					line: {
						id: secs[0].lineId,
						name: secs[0].lineName
					},
					stop1: {
						id: secs[0].stop1Id,
						name: secs[0].stop1Name
					},
					stop2: {
						id: secs[0].stop2Id,
						name: secs[0].stop2Name
					}
				};
			}

			if (secs.length >= 2) {
				top3.hot2 = {
					line: {
						id: secs[1].lineId,
						name: secs[1].lineName
					},
					stop1: {
						id: secs[1].stop1Id,
						name: secs[1].stop1Name
					},
					stop2: {
						id: secs[1].stop2Id,
						name: secs[1].stop2Name
					}
				};
			}

			if (secs.length >= 3) {
				top3.hot3 = {
					line: {
						id: secs[2].lineId,
						name: secs[2].lineName
					},
					stop1: {
						id: secs[2].stop1Id,
						name: secs[2].stop1Name
					},
					stop2: {
						id: secs[2].stop2Id,
						name: secs[2].stop2Name
					}
				};
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

		if (await userModel.findOne({ username: userData.username })) {
			const err = new Error(`A user already exists with the following username: ${this.username}`);
			err.name = "UserAlreadyExistsError";
			reject(err);
			return;
		}

		const user = new userModel();
		user.username = userData.username;
		user.email = userData.email;
		user.password = userData.password;
		user.showWatchlistByDefault = userData.showWatchlistByDefault;
		user.save().then(() => {
			resolve();
		}).catch(err => {
			logger.error("Couldn't modify user in the database");
			logger.xlog(err);
			reject(err);
		});
	});
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

		if (modifications.username) {
			if (!validateUsername(modifications.username))
				dataCheck.username = `Invalid username value: ${modifications.username}`;
			else
				user.username = modifications.username;
		}

		if (modifications.password) {
			if (!validatePassword(modifications.password))
				dataCheck.password = "Invalid password value";
			else
				user.password = modifications.password;
		}

		if (modifications.showWatchlistByDefault === "true" || modifications.showWatchlistByDefault === "false")
			user.showWatchlistByDefault = modifications.showWatchlistByDefault;
		else if (modifications.showWatchlistByDefault)
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

		if (!dataCheck.line && (!sectionData.line.id || !sectionData.line.name)) {
			dataCheck.line = "line ID or name was missing from the request body";
		}
		
		if (!dataCheck.stop1 && (!sectionData.stop1.id || !sectionData.stop1.name)) {
			dataCheck.stop1 = "stop1 ID or name was missing from the request body";
		}
		
		if (!dataCheck.stop2 && (!sectionData.stop2.id || !sectionData.stop2.name)) {
			dataCheck.stop2 = "stop2 ID or name was missing from the request body";
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