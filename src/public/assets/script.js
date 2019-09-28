
const bkk="https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";

let line = 0;

window.onload = function () {
    
    let pickLineText = document.getElementById("pick-line-text");

    pickLineText.addEventListener("keyup",(event) => {
        if (event.keyCode==13) {
            loadLine();
        }
    });


}

async function loadLine() {

    let input = document.getElementById("pick-line-text").value;
    
    let isInputCorrect = true;
    
    if (input=="") {
        isInputCorrect=false;
        alert("Kérjük válasszon járatot")
        return;
    }

    await $.ajax({
        method:"GET",
        url:"https://futar.bkk.hu/api/query/v1/ws/otp/api/where/search.json",
        dataType:"jsonp",
        data:{
            query:input,
        },
        success:function (r) {
            line = r.data.references.routes;
            let done=false;
            for (let prop in line) {
                if (line[prop].shortName.toLowerCase()==input.toLowerCase()) {
                    line = line[prop];
                    done=true;
                    break;
                }
            }
            if (!done) {
                for (let prop in line) {
                    line = line[prop];
                    done=true;
                    break;
                }
            }

            if (!line.id) {
                alert("Nem találtunk járatot");
                line=0;
                return;
            }

            
            
        },
        error:function (xhr, ajaxOptions, thrownError) {
            alert("error");
            alert(thrownError);
        },
        
    });

    if (line==0) {
        document.getElementById("pick-line-text").value="";
    } else {
        document.getElementById("pick-line-text").value=line.shortName;
    }
    
    


}