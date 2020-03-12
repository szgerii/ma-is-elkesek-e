const jwt = require("jsonwebtoken");
const router = require("../private_modules/router");
const userModel = require("../models/user");

/**
 * Splitter for login status
 * @returns 0 if the user isn't logged in, 1 if they are
 */
module.exports = (req, res) => {
	return new Promise(async (resolve, reject) => {
		const token = req.cookies["auth-token"];
	
		if (!token) {
			resolve(0);
			return;
		}
	
		try {
			const decoded = jwt.verify(token, process.env.jwtKey);
			const user = await userModel.findOne({ username: decoded.sub });
			
			if (!user) {
				res.setHeader("Set-Cookie", router.cookieBuilder("auth-token", "", {
					domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
					path: "/",
					expires: "Thu, 01 Jan 1970 00:00:00 GMT",
					sameSite: "Strict",
					httpOnly: true
				}));
				resolve(0);
				return;
			}
	
			req.username = user.username;
			resolve(1);
		} catch (err) {
			res.setHeader("Set-Cookie", router.cookieBuilder("auth-token", "", {
				domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict",
				httpOnly: true
			}));
			resolve(0);
		}
	});
}