const loginUrl = "/api/login";

let currentUsername = null;
let oldSettings = {

    username: null,
    isWatchlist: null

}

function setup() {
    const logoutLink = document.querySelector("#logout");
    
    logoutLink.addEventListener("click", () => {
        $.post("/logout", () => {
            window.location.assign("/");
        });
    });

    document.querySelector("#input-password").addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            saveChanges();
    });

    currentUsername = getUsername();

    loadOldSettings();
}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);

function loadOldSettings() {

    let button = document.querySelector("#input-submitBtn");
    button.setAttribute("onclick","");
    button.value = "Kérjük várjon...";

    let url = "/api/users/" + currentUsername;

    $.ajax({

        method: "GET",
        url: url,
        dataType: "json",

        success: function(r) {

            oldSettings.username = r.data.username;
            oldSettings.isWatchlist = r.data.showWatchlistByDefault;

            document.querySelector("#input-username").placeholder = oldSettings.username;
            if (oldSettings.isWatchlist) document.querySelector("#input-dd-watchlist").value = "true";
            else document.querySelector("#input-dd-watchlist").value="false";

            button.setAttribute("onclick","saveChanges();");
            button.value = "Változtatások mentése";

        }, 

        error: function(r) {

            button.value = "Hiba történt.";

        }

    });

}

function saveChanges() {

    const button = document.querySelector("#input-submitBtn");
    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const newPasswordInput = document.querySelector("#input-newPassword");
    const newPassword2Input = document.querySelector("#input-newPassword2");
    const isWatchlist = (document.querySelector("#input-dd-watchlist").value=="true");

    const usernameError = document.querySelector("#username-error");
    const passwordError = document.querySelector("#password-error");
    const newPasswordError = document.querySelector("#new-password-error");
    const newPasswordAgainError = document.querySelector("#new-password-again-error");
    
    usernameError.innerText = "";
    passwordError.innerText = "";
    newPasswordError.innerText = "";
    newPasswordAgainError.innerText = "";

    usernameInput.style.border = "";
    passwordInput.style.border = "";
    newPasswordInput.style.border = "";
    newPassword2Input.style.border = "";

    //Check which settings were changed.
    let usernameChanged = (usernameInput.value !== "" && usernameInput.value !== oldSettings.username);
    let watchlistChanged = (isWatchlist !== oldSettings.isWatchlist);
    let passwordChanged = (newPasswordInput.value !== "");

    //Quit if none of them were changed.
    if (!usernameChanged && !watchlistChanged && !passwordChanged) {

        passwordError.innerText = "Egyik beállítás sem lett megváltoztatva";
        return;

    }

    let data = {};

    //Check username format and add it to the data
    if (usernameChanged) {

        let hasError = true;

        switch(checkUsernameFormat(usernameInput.value)) {

            case "short": 
                usernameError.innerText = "A megadott felhasználónév rövidebb, mint 3 karakter.";
                break;

            case "long":
                usernameError.innerText = "A megadott felhasználónév hosszabb, mint 16 karakter.";
                break;
            
            case "incorrect":
                usernameError.innerText = "A felhasználónév csak az ABC kis és nagy betűit, számokat, aláhúzást és kötőjelet tartalmazhat.";
                break;
            
            case "correct":
                hasError = false;
                break;

            default:
                break;
    
        }

        if (hasError) {
            usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
            return;
        }

        data.username = usernameInput.value;

    }

    //Check password format and add it to the data
    if (passwordChanged) {

        let hasError = true;

        switch(checkPasswordFormat(newPasswordInput.value)) {

            case "short":
                newPasswordError.innerText = "A megadott jelszó rövidebb, mint 6 karakter.";
                return 0;

            case "correct":
                hasError = false;
                break;

            default:
                return 0;
    
        }

        if (hasError)
            newPasswordInput.style.border = ".07em solid rgb(255, 78, 78)";

        if (newPasswordInput.value !== newPassword2Input.value) {

            newPasswordAgainError.innerText = "A két megadott jelszó nem egyezik.";
            return;
    
        }

        if (hasError)
            return;

        data.newPassword = newPasswordInput.value;

    }

    //Add watchlist to the data
    if (watchlistChanged) {
        data.showWatchlistByDefault = isWatchlist;
    }

    switch(checkPasswordFormat(passwordInput.value)) {

        case "empty":
            passwordError.innerText = "Kérjük adja meg a jelenlegi jelszavát az igazoláshoz!";
            passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
            return;
            
        case "short":
            passwordError.innerText = "A megadott jelszó rövidebb, mint 6 karakter.";
            passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
            return;

        case "correct":
            data.password = passwordInput.value;
            break;

        default:
            return;

    }

    button.innerText = "Kérjük várjon...";
    let url = "/api/users/" + currentUsername;

    $.ajax({

        method: "PUT",
        url: url,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),

        success: function(r) {

            if (r.status=="success") {

                window.location.assign("/");

            }

        }, 

        error: function(r) {

            switch (r.status) {
                case 401:
                    passwordError.innerText = "A megadott jelszó helytelen";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                    break;

                case 403:
                    passwordError.innerText = "Hiba történt az azonosítás során. Kérjük próbáljon meg kilépni és újra bejelentkezni";
                    break;

                case 422:
                    passwordError.innerText = "A megadott adatok formátuma helytelen";
                    break;
            
                default:
                    alert("Hiba történt a bejelentkezés során. Kérjük próbálkozzon újra később");
                    break;
            }

            button.innerText = "Változtatások mentése";

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
