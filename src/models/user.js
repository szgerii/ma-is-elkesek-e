const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

const watchlistSectionSchema = new mongoose.Schema({
	section: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Section"
	},
	orderIndex: {
		type: Number
	}
});

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	signupDate: {
		type: Date,
		required: true,
		default: Date.now()
	},
	watchlist: {
		type: [watchlistSectionSchema]
	},
	showWatchlistByDefault: {
		type: Boolean,
		required: true,
		default: true
	}
});

userSchema.pre("save", function(next) {
	if (this.hash) {
		this.password = bcrypt.hashSync(this.password, SALT_ROUNDS);
		this.hash = false;
	}
	next();
});

userSchema.methods.checkPassword = function(password) {
	return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);