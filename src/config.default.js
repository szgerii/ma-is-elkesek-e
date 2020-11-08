const dbHost = "<DATABASE HOSTNAME COMES HERE>";
const dbUsername = "<DATABASE USERNAME COMES HERE>";
const dbPassword = "<DATABASE PASSWORD COMES HERE>";
const dbName = "<DATABASE NAME COMES HERE>";

module.exports = {
	databaseUrl: `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`,
	jwtKey: "<JWT KEY COMES HERE>",
	authTokenMaxAge: 30 * 24 * 60 * 60,
	domain: "<DOMAIN URL FOR COOKIES COMES HERE>",
	recaptchaSecretKey: "<RECAPTCHA SECRET KEY COMES HERE>"
};
