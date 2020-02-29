const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

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
		type: [mongoose.Schema.Types.ObjectId],
		ref: "Section"
	},
	showWatchlistByDefault: {
		type: Boolean,
		required: true,
		default: true
	},
});

userSchema.pre("save", function(next) {
	this.password = bcrypt.hashSync(this.password, SALT_ROUNDS);
	next();
});

userSchema.methods.checkPassword = function(password) {
	return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);