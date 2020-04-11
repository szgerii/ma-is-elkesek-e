
const loginUrl = "/api/login";

function setup() {

    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const submitButton = document.querySelector("#input-submitBtn");
    let usernameCorrect = passwordCorrect = false;

    usernameInput.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            login();
    });

    passwordInput.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            login();
    });

    usernameInput.addEventListener("input", e => {
        usernameCorrect = checkUsernameFormat(e.target.value) === "correct";
        
        submitButton.disabled = !(usernameCorrect && passwordCorrect);
    });
    
    passwordInput.addEventListener("input", e => {
        passwordCorrect = checkPasswordFormat(e.target.value) === "correct";
        
        submitButton.disabled = !(usernameCorrect && passwordCorrect);
    });

    document.querySelector("#button-wrapper").addEventListener("click", login);

}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);

function login() {

    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const submitButton = document.querySelector("#input-submitBtn");
    const usernameError = document.querySelector("#username-error");
    const passwordError = document.querySelector("#password-error");
    let hasFormattingError = false;

    usernameError.innerText = "";
    passwordError.innerText = "";
    usernameInput.style.border = "";
    passwordInput.style.border = "";

    switch (checkUsernameFormat(usernameInput.value)) {
        case "empty":
            usernameError.innerText = "Kérjük adjon meg egy felhasználónevet";
            usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;

        case "short":
            usernameError.innerText = "A felhasználónévnek legalább 3 karakterből kell állnia";
            usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;
        
        case "long":
            usernameError.innerText = "A felhasználónév legfeljebb 16 karakterből állhat";
            usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;

        case "incorrect":
            usernameError.innerText = "A felhasználónév csak az angol ABC betűit, számokat, kötőjelet és aláhúzást tartalmazhat";
            usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;
    
        default:
            break;
    }

    switch (checkPasswordFormat(passwordInput.value)) {
        case "empty":
            passwordError.innerText = "Kérjük adjon meg egy jelszót";
            passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;

        case "short":
            passwordError.innerText = "A jelszónak legalább 6 karakterből kell állnia";
            passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
            hasFormattingError = true;
            break;
    
        default:
            break;
    }

    if (hasFormattingError)
        return;

    submitButton.value = "Kérjük várjon...";
    submitButton.disabled = true;

    fetch(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    })
    .then(async response => {
        return {
            json: await response.json(),
            status: response.status
        };
    })
    .then(res => {
        submitButton.value = "Bejelentkezés";
        submitButton.disabled = false;

        if (res.json.status === "success") {
            window.location.assign("/");
        } else if (res.json.status === "fail") {
            if (res.status === 401) {

                if (res.json.data.username) {
                    usernameError.innerText = "A megadott felhasználónévvel nem található fiók";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else if (res.json.data.password) {
                    passwordError.innerText = "A megadott jelszó helytelen";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else {
                    usernameError.innerText = "A bejelentkezési adatok helytelenek";
                    passwordError.innerText = "A bejelentkezési adatok helytelenek";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                }

            } else if (res.status === 422) {

                if (res.json.data.username) {
                    usernameError.innerText = "A megadott felhasználónév formátuma nem megfelelő";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else if (res.json.data.password) {
                    passwordError.innerText = "A megadott jelszó formátuma nem megfelelő";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else {
                    usernameError.innerText = "A bejelentkezési adatok formátuma nem megfelelő";
                    passwordError.innerText = "A bejelentkezési adatok formátuma nem megfelelő";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                }

            }
        } else {
            passwordError.innerText = "Ismeretlen hiba történt a bejelentkezés során, kérjük probálkozzon újra később.";
        }
    })
    .catch(err => {
        submitButton.value = "Bejelentkezés";
        submitButton.disabled = false;
        console.debug(err);
        passwordError.innerText = "Ismeretlen hiba történt a bejelentkezés során, kérjük probálkozzon újra később.";
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
