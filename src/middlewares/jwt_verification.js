const jwt = require("jsonwebtoken");
const router = require("../private_modules/router.js");
const userModel = require("../models/user");

module.exports = async (req, res, done) => {
	const token = req.cookies["auth-token"];

	if (!token) {
		res.writeHead(401, {
			"Content-Type": "application/json",
			"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
		});
		res.end(router.genResponse("fail", {
			"auth-token": "The request was missing the auth-token cookie required for authentication"
		}));
		return;
	}

	try {
		const decoded = jwt.verify(token, process.env.jwtKey);
		const user = await userModel.findOne({ username: decoded.sub });
		
		if (!user) {
			res.writeHead(401, {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`,
				"Set-Cookie": router.genCookie("auth-token", "", {
					domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
					path: "/",
					expires: "Thu, 01 Jan 1970 00:00:00 GMT",
					sameSite: "Strict",
					httpOnly: true
				})
			});
			res.end(router.genResponse("fail", {
				"auth-token": "The username inside the auth-token cookie is invalid or the user has been deleted"
			}));
			return;
		}

		req.username = user.username;
		done();
	} catch (err) {
		res.writeHead(401, {
			"Content-Type": "application/json",
			"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`,
			"Set-Cookie": router.genCookie("auth-token", "", {
				domain: "localhost", // TODO: replace localhost after domain and hosting has been set up
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict",
				httpOnly: true
			})
		});
		res.end(router.genResponse("fail", {
			"auth-token": "The value of the auth-token cookie was invalid/expired"
		}));
	}
}