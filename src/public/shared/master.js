const getUsername = () => {

    let cookies = document.cookie.split("; ");

    for (let i=0; i<cookies.length; i++) if (cookies[i].split("=")[0]=="username") return cookies[i].split("=")[1];

}

function setup() {
	document.querySelector(".navbar-menu").addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");
	});
}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);