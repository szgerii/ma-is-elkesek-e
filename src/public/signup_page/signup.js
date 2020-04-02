
const signupUrl = "/api/users";

function setup() {
    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const passwordAgainInput = document.querySelector("#input-password2");
    const submitButton = document.querySelector("#input-submitBtn");

    let usernameCorrect = false, passwordCorrect = false;

    usernameInput.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            signup();
    });

    passwordInput.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            signup();
    });

    passwordAgainInput.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            signup();
    });

    usernameInput.addEventListener("input", e => {
        usernameCorrect = checkUsernameFormat(e.target.value) === "correct";
        
        submitButton.disabled = !(usernameCorrect && passwordCorrect && (passwordInput.value === passwordAgainInput.value));
    });
    
    passwordInput.addEventListener("input", e => {
        passwordCorrect = checkPasswordFormat(e.target.value) === "correct";
        
        submitButton.disabled = !(usernameCorrect && passwordCorrect && (passwordInput.value === passwordAgainInput.value));
    });
    
    passwordAgainInput.addEventListener("input", e => {
        submitButton.disabled = !(usernameCorrect && passwordCorrect && (passwordInput.value === passwordAgainInput.value));
    });

    document.querySelector("#button-wrapper").addEventListener("click", signup);
}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);

function signup() {

    const usernameInput = document.querySelector("#input-username");
    const passwordInput = document.querySelector("#input-password");
    const passwordAgainInput = document.querySelector("#input-password2");
    const isWatchlist = (document.querySelector("#input-dd-watchlist").value=="true");
    const submitButton = document.querySelector("#input-submitBtn");
    const usernameError = document.querySelector("#username-error");
    const passwordError = document.querySelector("#password-error");
    const passwordAgainError = document.querySelector("#password-again-error");
    let hasFormattingError = false;
    
    usernameError.innerText = "";
    passwordError.innerText = "";
    passwordAgainError.innerText = "";
    usernameInput.style.border = "";
    passwordInput.style.border = "";
    passwordAgainInput.style.border = "";

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

    if (passwordInput.value !== passwordAgainInput.value && !hasFormattingError) {
        hasFormattingError = true;
        passwordAgainError.innerText = "A két jelszó nem egyezik";
        passwordAgainInput.style.border = ".07em solid rgb(255, 78, 78)";
    }

    if (hasFormattingError)
        return;

    submitButton.disabled = true;
    submitButton.value = "Kérjük várjon...";

    $.ajax({

        method: "POST",
        url: signupUrl,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({username: usernameInput.value, password: passwordInput.value, showWatchlistByDefault: isWatchlist}),

        success: function(r) {

            if (r.status=="success") {

                window.location.assign("/");

            } 

        },

        error: function(r) {

            if (r.status==409) {

                usernameError.innerText = "A megadott felhasználónév már foglalt.";
                usernameInput.style.border = ".07em solid rgb(255, 78, 78)";

            } else if (r.status==422) {

                if (r.responseJSON.data.username) {
                    usernameError.innerText = "A megadott felhasználónév formátuma nem megfelelő.";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else {
                    passwordError.innerText = "A megadott jelszó formátuma nem megfelelő.";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                }


            } else {

                alert("Hiba történt a regisztráció során, kérjük próbálkozzon újra később.");

            }

            submitButton.disabled = false;
            submitButton.value = "Regisztráció";

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