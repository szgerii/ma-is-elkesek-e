const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		validate: {
			validator: function(v) {
				return /^([a-zA-Z0-9_-]){3,16}$/.test(v);
			},
			message: props => `Invalid username: ${props.value}`
		},
		required: true
	},
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		validate: {
			validator: function(v) {
				return v.length >= 6;
			},
			message: props => `Invalid password: ${props.value}`
		},
		required: true
	},
	passwordReminder: {
		type: String
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

userSchema.pre("save", async function(next) {
	if (await module.exports.findOne({ username: this.username })) {
		const err = new Error(`A user already exists with the following username: ${this.username}`);
		err.name = "UserAlreadyExistsError";
		throw err;
	}

	this.password = bcrypt.hashSync(this.password, SALT_ROUNDS);
	next();
});

userSchema.methods.comparePassword = async function(password) {
	return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);