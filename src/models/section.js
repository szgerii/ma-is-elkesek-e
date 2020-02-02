const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
	line: {
		type: String,
		required: true
	},
	stop1: {
		type: String,
		required: true
	},
	stop2: {
		type: String,
		required: true
	},
	count: {
		type: Number,
		required: true
	}
});

module.exports = mongoose.model("Section", sectionSchema);