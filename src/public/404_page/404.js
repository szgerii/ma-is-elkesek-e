window.onload = () => {
	document.querySelector(".navbar-menu").addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");
	});
	
	document.querySelector("#content-container button").addEventListener("click", () => {
		window.location = "/";
	});
};