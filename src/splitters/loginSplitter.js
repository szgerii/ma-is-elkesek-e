const jwt = require("jsonwebtoken");
const router = require("../private_modules/router");
const userModel = require("../models/user");

/**
 * Splits based on the login status of the user
 * @returns {Number} - 0 if the user isn't logged in, 1 if they are
 */
module.exports = async (req, res) => {
	const token = req.cookies["auth-token"];
	
	if (!token) {
		return 0;
	}

	try {
		const decoded = jwt.verify(token, process.env.jwtKey);
		const user = await userModel.findOne({ username: decoded.sub });
		
		if (!user) {
			res.setHeader("Set-Cookie", router.genCookie("auth-token", "", {
				domain: process.env.domain,
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict",
				httpOnly: true
			}));
			return 0;
		}

		req.username = user.username;
		req.showWatchlistByDefault = user.showWatchlistByDefault;
		return 1;
	} catch (err) {
		res.setHeader("Set-Cookie", router.genCookie("auth-token", "", {
			domain: process.env.domain,
			path: "/",
			expires: "Thu, 01 Jan 1970 00:00:00 GMT",
			sameSite: "Strict",
			httpOnly: true
		}));
		return 0;
	}
}