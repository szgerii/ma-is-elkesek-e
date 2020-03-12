
const loginUrl = "/api/login";

window.onload = () => {
	document.querySelector(".navbar-menu").addEventListener("click", ()=> {
		document.querySelector(".navbar-list").classList.toggle("navbar-active");
    });
}

function login() {

    let username = document.querySelector("#input-username").value;
    let password = document.querySelector("#input-password").value;
    let error = document.querySelector(".error-text");

    error.innerText = "Kérjük várjon...";

    switch(checkUsernameFormat(username)) {

        case "empty": error.innerText = "Kérjük adja meg felhasználónevét!";return 0;
        case "short": error.innerText = "A megadott felhasználónév rövidebb, mint 3 karakter."; return 0;
        case "long": error.innerText = "A megadott felhasználónév hosszabb, mint 16 karakter.";return 0;
        case "correct": break;
        default: return 0;

    }

    switch(checkPasswordFormat(password)) {

        case "empty": error.innerText = "Kérjük adja meg jelszavát!";return 0;
        case "short": error.innerText = "A megadott jelszó rövidebb, mint 6 karakter."; return 0;
        case "correct": break;
        default: return 0;

    }

    $.ajax({

        method: "POST",
        url: loginUrl,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({username: username, password: password}),

        success: function(r) {

            if (r.status=="success") {

                window.location.replace("/");

            } 

        },

        error: function(r) {

            if (r.status==401) {

                error.innerText = "A megadott felhasználónév vagy jelszó helytelen!"; 
 
            } else if (r.status==422) {
 
                 error.innerText = "A megadott felhasználónév vagy jelszó formátuma nem megfelelő";
                 if (r.data.username) console.log(r.data.username);
                 if (r.data.password) console.log(r.data.password);
 
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
