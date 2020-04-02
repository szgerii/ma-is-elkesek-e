
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

    usernameError.innerText = "";
    passwordError.innerText = "";
    usernameInput.style.border = "";
    passwordInput.style.border = "";

    submitButton.value = "Kérjük várjon...";
    submitButton.disabled = true;

    let error = "";

    $.ajax({

        method: "POST",
        url: loginUrl,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({username: usernameInput.value, password: passwordInput.value}),

        success: function(r) {

            if (r.status=="success") {

                window.location.assign("/");

            } 

        },

        error: function(r) {

            submitButton.value = "Bejelentkezés";
            submitButton.disabled = false;

            if (r.status==401) {

                if (r.responseJSON.data.username) {
                    usernameError.innerText = "A megadott felhasználónévvel nem található fiók";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else if (r.responseJSON.data.password) {
                    passwordError.innerText = "A megadott jelszó helytelen";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else {
                    usernameError.innerText = "A bejelentkezési adatok helytelenek";
                    passwordError.innerText = "A bejelentkezési adatok helytelenek";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                }
                
                
            } else if (r.status==422) {
                
                if (r.responseJSON.data.username) {
                    usernameError.innerText = "A megadott felhasználónév formátuma nem megfelelő";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else if (r.responseJSON.data.password) {
                    passwordError.innerText = "A megadott jelszó formátuma nem megfelelő";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                } else {
                    usernameError.innerText = "A bejelentkezési adatok formátuma nem megfelelő";
                    passwordError.innerText = "A bejelentkezési adatok formátuma nem megfelelő";
                    usernameInput.style.border = ".07em solid rgb(255, 78, 78)";
                    passwordInput.style.border = ".07em solid rgb(255, 78, 78)";
                }
 
            } else {

                passwordError.innerText = "Ismeretlen hiba történt a bejelentkezés során, kérjük probálkozz újra később.";
                
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
