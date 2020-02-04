const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
	lineId: {
		type: String,
		required: true
	},
	stop1Id: {
		type: String,
		required: true
	},
	stop2Id: {
		type: String,
		required: true
	},
	lineName: {
		type: String,
		required: true
	},
	stop1Name: {
		type: String,
		required: true
	},
	stop2Name: {
		type: String,
		required: true
	},
	count: {
		type: Number,
		required: true
	}
});

module.exports = mongoose.model("Section", sectionSchema);