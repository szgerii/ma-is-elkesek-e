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
		if (!sectionData.lineId ||
			!sectionData.lineName ||
			!sectionData.stop1Id ||
			!sectionData.stop1Name ||
			!sectionData.stop2Id ||
			!sectionData.stop2Name) {
				const err = new Error("A necessary field was missing from the request body");
				err.name = "InformationMissingError";
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
}

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
}

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

exports.createUser = userData => {
	return new Promise(async (resolve, reject) => {
		if (!userData.username ||
			!userData.email ||
			!userData.password ||
			!userData.showWatchlistByDefault) {
				const err = new Error("A necessary field was missing from the request body");
				err.name = "InformationMissingError";
				reject(err);
		}

		try {
			const user = new userModel();
			user.username = userData.username;
			user.email = userData.email;
			user.password = userData.password;
			user.showWatchlistByDefault = userData.showWatchlistByDefault;
			await user.save();
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}