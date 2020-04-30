const loginUrl = "/api/login";

let currentUsername = null;
let oldSettings = {

    username: null,
    isWatchlist: null,
    latency: null

}

function setup() {

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

    fetch(url)
    .then(async response => {
        return {
            json: await response.json(),
            status: response.status
        };
    })
    .then(res => {
        if (res.json.status === "success") {
            oldSettings.username = res.json.data.username;
            oldSettings.isWatchlist = res.json.data.showWatchlistByDefault;
            oldSettings.latency = res.json.data.watchlistLatency;
    
            document.querySelector("#input-username").placeholder = oldSettings.username;
            document.querySelector("#input-dd-watchlist").value = `${oldSettings.isWatchlist}`;
            document.querySelector("#input-watchlistLatency").placeholder = oldSettings.latency;
    
            button.setAttribute("onclick","saveChanges();");
            button.value = "Változtatások mentése";
        } else {
            alert("Ismeretlen hiba történt. Kérjük próbáljon meg újra bejelentkezni, vagy próbálkozzon újra később");
            window.location.assign("/");
        }
    })
    .catch(err => {
        console.debug(err);
        alert("Ismeretlen hiba történt. Kérjük próbáljon meg újra bejelentkezni, vagy próbálkozzon újra később");
        window.location.assign("/");
    });
}

function saveChanges() {

    const button = document.querySelector("#input-submitBtn");
    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const newPasswordInput = document.querySelector("#input-newPassword");
    const newPassword2Input = document.querySelector("#input-newPassword2");
    const isWatchlist = (document.querySelector("#input-dd-watchlist").value=="true");
    const watchlistLatency = Number(document.querySelector("#input-watchlistLatency").value);

    const usernameError = document.querySelector("#username-error");
    const passwordError = document.querySelector("#password-error");
    const newPasswordError = document.querySelector("#new-password-error");
    const newPasswordAgainError = document.querySelector("#new-password-again-error");
    const watchlistLatencyError = document.querySelector("#watchlistLatency-error");
    
    usernameError.innerText = "";
    passwordError.innerText = "";
    newPasswordError.innerText = "";
    newPasswordAgainError.innerText = "";
    watchlistLatencyError.innerText = "";

    usernameInput.style.border = "";
    passwordInput.style.border = "";
    newPasswordInput.style.border = "";
    newPassword2Input.style.border = "";

    //Check which settings were changed.
    let usernameChanged = (usernameInput.value !== "" && usernameInput.value !== oldSettings.username);
    let watchlistChanged = (isWatchlist !== oldSettings.isWatchlist);
    let passwordChanged = (newPasswordInput.value !== "");
    let latencyChanged = (watchlistLatency !== 0 && watchlistLatency !== oldSettings.latency);

    //Quit if none of them were changed.
    if (!usernameChanged && !watchlistChanged && !passwordChanged && !latencyChanged) {

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

    //Check watchlist latency format and add it to the data
    if (latencyChanged) {

        let hasError = true;

        switch(checkLatencyFormat(watchlistLatency)) {

            case "nan": 
                watchlistLatencyError.innerText = "A megadott vizsgálandó időnek számnak kell lennie.";
                break;

            case "small":
                watchlistLatencyError.innerText = "A vizsgálandó időnek legalább 10 percnek kell lennie.";
                break;
            
            case "big":
                watchlistLatencyError.innerText = "A vizsgálandó idő nem lehet 120 percnél nagyobb.";
                break;
            
            case "correct":
                hasError = false;
                break;

            default:
                break;
    
        }

        if (hasError) {
            return;
        }

        data.watchlistLatency = watchlistLatency;

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

    fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(async response => {
        return {
            json: await response.json(),
            status: response.status
        };
    })
    .then(res => {
        if (res.json.status === "success") {
            window.location.assign("/");
        } else if (res.json.status === "fail") {

            if (res.status === 401) {
                passwordError.innerText = "A megadott jelszó helytelen";
                passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
            } else if (res.status === 403) {
                passwordError.innerText = "Hiba történt az azonosítás során. Kérjük próbáljon meg kilépni és újra bejelentkezni";
            } else if (res.status === 409) {
                usernameError.innerText = "Ez a felhasználónév már foglalt.";
            } else if (res.status === 422) {
                passwordError.innerText = "A megadott adatok formátuma helytelen";
            } else {
                alert("Hiba történt a mentés során. Kérjük próbálkozzon újra később");
            }
            
        } else {
            alert("Hiba történt a mentés során. Kérjük próbálkozzon újra később");
        }

        button.innerText = "Változtatások mentése";
    })
    .catch(err => {
        button.innerText = "Változtatások mentése";
        console.debug(err);
        alert("Ismeretlen hiba történt a bejelentkezés során, kérjük probálkozzon újra később.");
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

function checkLatencyFormat(latency) {

    if (isNaN(latency)) {
        return "nan";
    } else if (latency<10) {
        return "small";
    } else if (latency>120) {
        return "big";
    } else {
        return "correct";
    }

}
