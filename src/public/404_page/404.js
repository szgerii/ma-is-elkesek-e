function setup () {
	document.querySelector("#content-container button").addEventListener("click", () => {
		window.location = "/";
	});
};

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);