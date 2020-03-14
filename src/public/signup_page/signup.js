
const signupUrl = "/api/users";

window.onload = () => {

	document.querySelector(".navbar-menu").addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");
    });

    document.querySelector("#input-username").addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            login();
    });

    document.querySelector("#input-password").addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            login();
    });

    document.querySelector("#input-password2").addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            login();
    });

}

function signup() {

    let username = document.querySelector("#input-username").value;
    let password = document.querySelector("#input-password").value;
    let password2 = document.querySelector("#input-password2").value;
    let isWatchlist = (document.querySelector("#input-dd-watchlist").value=="true");
    let error = document.querySelector(".error-text");

    error.innerText = "Kérjük várjon...";

    switch(checkUsernameFormat(username)) {

        case "empty": error.innerText = "Kérjük adja meg felhasználónevét!";return 0;
        case "short": error.innerText = "A megadott felhasználónév rövidebb, mint 3 karakter."; return 0;
        case "long": error.innerText = "A megadott felhasználónév hosszabb, mint 16 karakter.";return 0;
        case "incorrect": error.innerText = "A felhasználónév csak az ABC kis és nagy betűit, számokat, aláhúzást és kötőjelet tartalmazhat.";return 0;
        case "correct": break;
        default: return 0;

    }

    if (password!=password2) {

        error.innerText = "A két megadott jelszó nem eggyezik.";
        return 0;

    }

    switch(checkPasswordFormat(password)) {

        case "empty": error.innerText = "Kérjük adja meg jelszavát!";return 0;
        case "short": error.innerText = "A megadott jelszó rövidebb, mint 6 karakter."; return 0;
        case "correct": break;
        default: return 0;

    }

    $.ajax({

        method: "POST",
        url: signupUrl,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({username: username, password: password, showWhatchlistByDefault: isWatchlist}),

        success: function(r) {

            if (r.status=="success") {

                window.location.replace("/");

            } 

        },

        error: function(r) {

            if (r.status==409) {

                error.innerText = "A megadott felhasználónév már foglalt.";

            } else if (r.status==422) {

                error.innerText = "A megadott felhasználónév vagy jelszó nem megfelelő.";

            } else {

                error.innerText = "Hiba történt  a bejelentkezés során.";

            }

        }
    });

}

function checkUsernameFormat(username) {

    if (username=="") {
       return "empty"; 
    } else if (username.length<3) {
        return "short";
    } else if (username.length>16) {
        return "long";
    } else if (!(/^([a-zA-Z0-9_-]){3,16}$/.test(username))) {
        return "incorrect";
    } else {
        return "correct";
    }

}

function checkPasswordFormat(password) {

    if (password=="") {
        return "empty";
    } else if (password.length<6) {
        return "short";
    } else {
        return "correct";
    }

}