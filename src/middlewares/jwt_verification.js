const jwt = require("jsonwebtoken");
const router = require("../../private_modules/router.js");
const userModel = require("../models/user");

/**
 * @typedef {Object} IncomingMessage
 * @typedef {Object} ServerResponse
 */

/**
 * JSON Web Token verifying middleware (it checks if the token is present/correct and responds accordingly, if there's something wrong with the request)
 * @param {IncomingMessage} req - the request object coming from the client
 * @param {ServerResponse} res - the response object that the server will send back
 * @param {function} done - the callback function the middleware calls once it's finished processing the request
 */
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
			res.setHeader("Set-Cookie", [
				router.genCookie("auth-token", "", {
					domain: process.env.domain,
					path: "/",
					expires: "Thu, 01 Jan 1970 00:00:00 GMT",
					sameSite: "Strict",
					httpOnly: true
				}),
				router.genCookie("username", "", {
					domain: process.env.domain,
					path: "/",
					expires: "Thu, 01 Jan 1970 00:00:00 GMT",
					sameSite: "Strict"
				})
			]);
			res.writeHead(401, {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
			});
			res.end(router.genResponse("fail", {
				"auth-token": "The username inside the auth-token cookie is invalid or the user has been deleted"
			}));
			return;
		}

		req.username = user.username;
		done();
	} catch (err) {
		res.setHeader("Set-Cookie", [
			router.genCookie("auth-token", "", {
				domain: process.env.domain,
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict",
				httpOnly: true
			}),
			router.genCookie("username", "", {
				domain: process.env.domain,
				path: "/",
				expires: "Thu, 01 Jan 1970 00:00:00 GMT",
				sameSite: "Strict"
			})
		]);
		res.writeHead(401, {
			"Content-Type": "application/json",
			"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
		});
		res.end(router.genResponse("fail", {
			"auth-token": "The value of the auth-token cookie was invalid/expired"
		}));
	}
}