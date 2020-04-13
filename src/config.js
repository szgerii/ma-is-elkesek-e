const dbUsername = "<USERNAME COMES HERE>";
const dbPassword = "<PASSWORD COMES HERE>";

module.exports = {
	databaseUrl: `mongodb+srv://${dbUsername}:${dbPassword}@ma-is-elkesek-e-ejiov.mongodb.net/live?retryWrites=true&w=majority`,
	jwtKey: "<JWT KEY COMES HERE>",
	authTokenMaxAge: 30 * 24 * 60 * 60,
	domain: "ma-is-elkesek-e.hu"
};