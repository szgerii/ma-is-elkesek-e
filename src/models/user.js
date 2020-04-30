const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

/**
 * The mongoose schema of a watchlist element
 */
const watchlistSectionSchema = new mongoose.Schema({
	/**
	 * The id of the section this watchlist element is associated with
	 */
	section: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Section"
	},
	/**
	 * The number of this element in the watchlist (watchlist is sorted by this value)
	 */
	orderIndex: {
		type: Number
	}
});

/**
 * The mongoose schema of a user
 */
const userSchema = new mongoose.Schema({
	/**
	 * Unique username of the user
	 */
	username: {
		type: String,
		required: true
	},
	/**
	 * The hashed password of the user
	 */
	password: {
		type: String,
		required: true
	},
	/**
	 * The date of the user's registration
	 */
	signupDate: {
		type: Date,
		required: true,
		default: Date.now()
	},
	/**
	 * The watchlist of the user
	 */
	watchlist: {
		type: [watchlistSectionSchema]
	},
	/**
	 * The number of minutes that will be used for watchlist average calculations
	 */
	watchlistTime: {
		type: Number,
		required: true,
		default: 20
	},
	/**
	 * This indicates whether or not the watchlist should be showed to user after login
	 */
	showWatchlistByDefault: {
		type: Boolean,
		required: true,
		default: true
	}
});

/**
 * Hashes the password before saving the user to the database if the hash property of the user object is set to true
 */
userSchema.pre("save", function(next) {
	if (this.hash) {
		this.password = bcrypt.hashSync(this.password, SALT_ROUNDS);
		this.hash = false;
	}
	next();
});

/**
 * Checks if a password is correct for the user
 * @param {String} password - the password that should be checked
 * @return {Promise} - A promise that resolves with true if the password is correct, or with false otherwise
 */
userSchema.methods.checkPassword = function(password) {
	return bcrypt.compare(password, this.password);
};

/**
 * The mongoose model of users
 */
module.exports = mongoose.model("User", userSchema);