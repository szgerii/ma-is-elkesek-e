const getCookie = cookie => {
	let cookies = document.cookie.split("; ");

	for (let i = 0; i < cookies.length; i++) {
		if (cookies[i].split("=")[0] === cookie)
			return cookies[i].split("=")[1];
	}

	return null;
};

const getUsername = () => {
	return getCookie("username");
};

function setup() {
	const navbarMenu = document.querySelector(".navbar-menu");
	const logoutLink = document.querySelector("#logout");
	
	if (navbarMenu) {
		navbarMenu.addEventListener("click", ()=> {
			document.querySelector(".navbar-list").classList.toggle("navbar-active");
	
			navbarMenu.innerHTML = navbarMenu.innerHTML.charCodeAt(0) === 9776 ? "&#10005" : "&#9776";
		});		
	}

	if (logoutLink) {
		logoutLink.addEventListener("click", () => {
			fetch("/logout", { method: "POST" }).then(() => {
				window.location.assign("/");
			});
		});
	}

	if (!getCookie("cookie-consent")) {
		document.documentElement.classList.add("extended");
		document.body.classList.add("extended");
		const footer = document.createElement("footer");
		const p = document.createElement("p");
		const button = document.createElement("button");

		p.innerText = "Ez az oldal sütiket használ a működéshez. Az oldal használatával automatikusan hozzájárul a sütik használatához.";
		
		button.innerText = "Elfogadás";
		button.addEventListener("click", () => {
			document.cookie = "cookie-consent=true; expires=Sun, 09 Jun 2069 00:00:00 GMT;";
			document.querySelector("footer").remove();
			document.body.classList.remove("extended");
			document.documentElement.classList.remove("extended");
		});
		
		footer.appendChild(p);
		footer.appendChild(button);
		document.body.appendChild(footer);
	}
}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);