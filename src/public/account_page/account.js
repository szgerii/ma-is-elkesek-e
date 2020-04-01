
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

    let url = "/api/users/"+currentUsername;

    $.ajax({

        method: "GET",
        url: url,
        dataType: "json",

        success: function(r) {

            oldSettings.username = r.data.username;
            oldSettings.isWatchlist = r.data.showWatchlistByDefault;

            document.querySelector("#input-username").value = oldSettings.username;
            if (oldSettings.isWatchlist) document.querySelector("#input-dd-watchlist").value="true";
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

    let result = document.querySelector("#result");
    result.innerText = "Kérjük várjon...";

    let username = document.querySelector("#input-username").value;
    let isWatchlist = (document.querySelector("#input-dd-watchlist").value=="true");
    let password = document.querySelector("#input-newPassword").value;
    let password2 = document.querySelector("#input-newPassword2").value;

    //Check which settings were changed.
    let usernameChanged = (username!=oldSettings.username);
    let watchlistChanged = (isWatchlist!=oldSettings.isWatchlist);
    let passwordChanged = (password!="");

    //Quit if none of them were changed.
    if (!usernameChanged&&!watchlistChanged&&!passwordChanged) {

        result.innerText = "";
        return;

    }

    let data = {};

    //Check username format and add it to the data
    if (usernameChanged) {

        switch(checkUsernameFormat(username)) {

            case "empty": result.innerText = "Kérjük adja meg felhasználónevét!";return 0;
            case "short": result.innerText = "A megadott felhasználónév rövidebb, mint 3 karakter."; return 0;
            case "long": result.innerText = "A megadott felhasználónév hosszabb, mint 16 karakter.";return 0;
            case "incorrect": result.innerText = "A felhasználónév csak az ABC kis és nagy betűit, számokat, aláhúzást és kötőjelet tartalmazhat.";return 0;
            case "correct": break;
            default: return 0;
    
        }

        data.username = username;

    }

    //Check password format and add it to the data
    if (passwordChanged) {

        if (password!=password2) {

            result.innerText = "A két megadott jelszó nem egyezik.";
            return 0;
    
        }

        switch(checkPasswordFormat(password)) {

            case "short": result.innerText = "A megadott új jelszó rövidebb, mint 6 karakter."; return 0;
            case "correct": break;
            default: return 0;
    
        }

        data.password = password;

    }

    //Add watchlist to the data
    if (watchlistChanged) {
        data.showWatchlistByDefault = isWatchlist;

    }

    let realPassword = document.querySelector("#input-password").value;

    switch(checkPasswordFormat(realPassword)) {

        case "empty": result.innerText = "Kérjük adja meg jelszavát!";return 0;
        case "short": result.innerText = "A megadott jelszó rövidebb, mint 6 karakter."; return 0;
        case "correct": break;
        default: return 0;

    }


    //Attempt logging in with the current user and the given password
    $.ajax({

        method: "POST",
        url: loginUrl,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({username: currentUsername, password: realPassword}),

        success: function(r) {

            if (r.status=="success") {

                //Attempt changing the user's settings
                let url = "/api/users/"+currentUsername;

                $.ajax({

                    method: "PUT",
                    url: url,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(data),

                    success: function(r) {

                        if (r.status=="success") {

                            //Refreshing login

                            let loginData = {};
                            if (data.username) loginData.username = data.username;
                            else loginData.username = currentUsername;

                            if (data.password) loginData.password = data.password;
                            else loginData.password = realPassword;

                            $.ajax({

                                method: "POST",
                                url: loginUrl,
                                contentType: "application/json; charset=utf-8",
                                dataType: "json",
                                data: JSON.stringify(loginData),

                                success: function(r) {

                                    if (r.status=="success") {

                                        window.location.assign("/");
                        
                                    } 

                                },

                                error: function(r) {

                                    window.location.assign("/login");    

                                } 

                            });

                        }

                    }, 

                    error: function(r) {

                        if (r.status==403) {

                            result.innerText = "A megadott felhasználónév foglalt.";

                        } else if (r.status==404) {

                            result.innerText = "A kért felhasználó nem létezik.";

                        } else if (r.status==422) {

                            result.innerText = "A megadott adatok formátuma nem megfelelő.";
                            if (r.data.username) console.log(r.data.username);
                            if (r.data.password) console.log(r.data.password);
                            if (r.data.showWatchlistByDefault) console.log(r.data.showWatchlistByDefault);

                        } else {

                            result.innerText = "Hiba történt a beállítások megváltoztatása során.";

                        }

                    }

                });

            } 

        },

        error: function(r) {

            if (r.status==401) {

                result.innerText = "A megadott jelszó téves!"; 
 
            } else if (r.status==422) {
 
                result.innerText = "A megadott jelszó formátuma nem megfelelő";
                if (r.data.username) console.log(r.data.username);
                if (r.data.password) console.log(r.data.password);
 
            } else {

                result.innerText = "Hiba történt a bejelentkezés során.";
                
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
