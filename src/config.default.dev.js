const dbHost = "ma-is-elkesek-e-ejiov.mongodb.net";
const dbUsername = "dev";
const dbPassword = "<DATABASE PASSWORD COMES HERE>";
const dbName = "dev";

module.exports = {
	databaseUrl: `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`,
	jwtKey: "ee2c1a1df5ca089a92993b24831dd994",
	authTokenMaxAge: 30 * 24 * 60 * 60,
	domain: "ma-is-elkesek-e.hu"
};
