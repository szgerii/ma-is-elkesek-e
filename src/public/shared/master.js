const getUsername = () => {

    let cookies = document.cookie.split("; ");

    for (let i=0; i<cookies.length; i++) if (cookies[i].split("=")[0]=="username") return cookies[i].split("=")[1];

}

function setup() {
	const navbarMenu = document.querySelector(".navbar-menu");
	const logoutLink = document.querySelector("#logout");
    
	navbarMenu.addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");

		navbarMenu.innerHTML = navbarMenu.innerHTML.charCodeAt(0) === 9776 ? "&#10005" : "&#9776";
	});

	if (logoutLink) {
		logoutLink.addEventListener("click", () => {
			fetch("/logout", { method: "POST" }).then(() => {
				window.location.assign("/");
			});
		});
	}
}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);