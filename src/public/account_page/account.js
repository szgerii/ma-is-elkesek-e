
let oldSettings = {

    username: null,
    password: null,
    isWatchlist: null

}

window.onload = function() {

    const logoutLink = document.querySelector("#logout");

    document.querySelector(".navbar-menu").addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");
    });
    
    logoutLink.addEventListener("click", () => {
        $.post("/logout", () => {
            window.location.assign("/");
        });
    });

    loadOldSettings();

}

function loadOldSettings() {

    

}

function login() {



}