const dbHost = "ma-is-elkesek-e-ejiov.mongodb.net";
const dbUsername = "<DATABASE USERNAME COMES HERE>";
const dbPassword = "<DATABASE PASSWORD COMES HERE>";
const dbName = "live";

module.exports = {
	databaseUrl: `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`,
	jwtKey: "<JWT KEY COMES HERE>",
	authTokenMaxAge: 30 * 24 * 60 * 60,
	domain: "ma-is-elkesek-e.hu",
	recaptchaSecretKey: "<RECAPTCHA SECRET KEY COMES HERE>"
};
