const jwt = require("jsonwebtoken");
const router = require("../private_modules/router");
const userModel = require("../models/user");

/**
 * @returns 0 if the user isn't logged in, 1 if they are
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
				domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict",
				httpOnly: true
			}));
			return 0;
			return;
		}

		req.username = user.username;
		return 1;
	} catch (err) {
		res.setHeader("Set-Cookie", router.genCookie("auth-token", "", {
			domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
			path: "/",
			expires: "Thu, 01 Jan 1970 00:00:00 GMT",
			sameSite: "Strict",
			httpOnly: true
		}));
		return 0;
	}
}