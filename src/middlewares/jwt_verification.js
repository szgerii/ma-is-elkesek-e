const jwt = require("jsonwebtoken");
const genResponse = require("../private_modules/router").genResponse;
const userModel = require("../models/user");

module.exports = (req, res) => {
	return new Promise(async (resolve, reject) => {
		const token = req.cookies["auth-token"];
	
		if (!token) {
			res.writeHead(401, {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`
			});
			res.end(genResponse("fail", {
				"auth-token": "The request was missing the auth-token cookie required for authentication"
			}));
			resolve(-1);
			return;
		}
	
		try {
			const decoded = jwt.verify(token, process.env.jwtKey);
			const user = await userModel.findOne({ username: decoded.sub });
			
			if (!user) {
				res.writeHead(401, {
					"Content-Type": "application/json",
					"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`,
					"Set-Cookie": "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
				});
				res.end(genResponse("fail", {
					"auth-token": "The username inside the auth-token cookie is invalid or the user has been deleted"
				}));
				resolve(-1);
				return;
			}
	
			req.username = user.username;
			resolve(0);
		} catch (err) {
			res.writeHead(401, {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer realm="Access to ${req.baseUrl}"`,
				"Set-Cookie": "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
			});
			res.end(genResponse("fail", {
				"auth-token": "The value of the auth-token cookie was invalid/expired"
			}));
			resolve(-1);
		}
	});
}