const mongoose = require("mongoose");

/**
 * The mongoose schema of a section
 */
const sectionSchema = new mongoose.Schema({
	/**
	 * The BKK id of the line
	 */
	lineId: {
		type: String,
		required: true
	},
	/**
	 * The BKK id of the first stop
	 */
	stop1Id: {
		type: String,
		required: true
	},
	/**
	 * The BKK id of the second stop
	 */
	stop2Id: {
		type: String,
		required: true
	},
	/**
	 * The display name of the line
	 */
	lineName: {
		type: String,
		required: true
	},
	/**
	 * The display name of the first stop
	 */
	stop1Name: {
		type: String,
		required: true
	},
	/**
	 * The display name of the second stop
	 */
	stop2Name: {
		type: String,
		required: true
	},
	/**
	 * The number of people who have checked this section
	 */
	count: {
		type: Number,
		required: true
	}
});

/**
 * @return {Object} - The mongoose model of sections
 */
module.exports = mongoose.model("Section", sectionSchema);