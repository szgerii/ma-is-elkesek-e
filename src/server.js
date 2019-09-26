const   http  = require('http'),
        fs    = require('fs');

// HTTP server stuff
const PORT = 1104 || process.env.PORT;
const server = http.createServer(ddosProtection);

// Store the files in memory
let files = [];

// DoS
const DOS_BLOCK_TIMEOUT = 5 * 60000, DOS_PROTECTION_TIMEOUT = 0.5 * 60000, DOS_PLUS_TIMEOUT = 2 * 60000, DOS_MAX_REQUEST = 300;
let dosProtection = {};

// DDoS
const DDOS_MAX_REQUEST_COUNT = 100;
let requestCount = 0, ddosQueue = [];

start();

// Loads files into memory and starts listening on PORT
function start() {

    files.push(fs.readFileSync(__dirname + "/public/index.html")); // 0
    files.push(fs.readFileSync(__dirname + "/public/assets/styles.css")); // 1
    files.push(fs.readFileSync(__dirname + "/public/assets/script.js")); // 2
    files.push(fs.readFileSync(__dirname + "/public/assets/Jquery.js")); // 3
    files.push(fs.readFileSync(__dirname + "/public/assets/images/background.png")); // 4
    files.push(fs.readFileSync(__dirname + "/public/assets/images/icon.png")); // 5

    server.listen(PORT);
    console.log(`Server listening on port ${PORT}`);

}

// Queue the incoming request if the current request count has hit its limit
function ddosProtection(req, res) {
    
    if (requestCount++ < DDOS_MAX_REQUEST_COUNT) {
        router(req, res);
    } else {
        ddosQueue.push({req, res});
    }

}

function router(req, res) {

    if (dosProtection[req.connection.remoteAddress] === undefined) {
        dosProtection[req.connection.remoteAddress] = {
            reqCount: 0,
            blocked: false,
            timeOfBlock: -1,
            blockTimeout: 0,
            numOfBlocks: 0};
    }

    // Increase the number of requests sent from this IP
    const currentDosProtection = dosProtection[req.connection.remoteAddress];
    currentDosProtection.reqCount = currentDosProtection.reqCount + 1 || 1;
    
    // Check if the client has reached the limit
    if (currentDosProtection.reqCount > DOS_MAX_REQUEST) {
        
        if (currentDosProtection.blocked) {

            // Clear DoS block if his timeout has expired, increase the timeout otherwise
            if (Date.now() - currentDosProtection.timeOfBlock > currentDosProtection.blockTimeout) {
                
                currentDosProtection.blocked = false;
                currentDosProtection.timeOfBlock = -1;
                currentDosProtection.blockTimeout = 0;
                currentDosProtection.reqCount = 0;

            } else
                currentDosProtection.blockTimeout += DOS_PLUS_TIMEOUT * currentDosProtection.numOfBlocks * (currentDosProtection.reqCount - DOS_MAX_REQUEST);
            
            if (currentDosProtection.blocked) {
                handleNextRequest();
                res.end(`DoS Védelem: Túl sok kérés jött erről az IP címről az utóbbi időben, úgyhogy tiltva lett ${currentDosProtection.blockTimeout / 60000} percre. Kérlek ne próbáld meg befrissíteni az oldalt, mert azzal csak plusz tiltási időt kapsz.`);
            }

        } else {

            // Block the IP
            currentDosProtection.blocked = true;
            currentDosProtection.timeOfBlock = Date.now();
            currentDosProtection.blockTimeout = DOS_BLOCK_TIMEOUT * ++currentDosProtection.numOfBlocks;
       
        }
        
        if (currentDosProtection.blocked)
            return;

    } else {

        // Decrease the request count after a specified amount of time
        setTimeout(() => {
            if (!currentDosProtection.blocked)
                currentDosProtection.reqCount--;
        }, DOS_PROTECTION_TIMEOUT);
    
    }

    // Check if the method is correct
    if (req.method === "GET") {

        // Send response to client
        switch (getBaseUrl(req.url)) {

            case "/":
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(files[0]);
                break;
            
            case "/assets/styles.css":
                res.writeHead(200, {"Content-Type": "text/css"});
                res.end(files[1]);
                break;
            
            case "/assets/script.js":
                res.writeHead(200, {"Content-Type": "text/javascript"});
                res.end(files[2]);
                break;

            case "/assets/Jquery.js":
                res.writeHead(200, {"Content-Type": "text/javascript"});
                res.end(files[3]);
                break;

            case "/assets/images/background.png":
                res.writeHead(200, {"Content-Type": "image/png"});
                res.end(files[4]);
                break;

            case "/assets/images/icon.png":
                res.writeHead(200, {"Content-Type": "image/png"});
                res.end(files[5]);
                break;

            default:
                res.writeHead(404, {"Content-Type": "text/html"});
                res.end("404: Page Not Round");
                break;

        }

        handleNextRequest();

    } else {

        handleNextRequest();
        res.writeHead(405, {"Content-Type": "text/html"});
        res.end(`405: Nem megfelelő HTTP metódus (${req.method})`);

    }
}

function handleNextRequest() {
    
    // Decrease the count of request handled at this moment (DDoS)
    requestCount--;
    
    // Serve next request from queue if available
    
    if (ddosQueue.length === 0)
        return;

    const nextReq = ddosQueue.shift();
    router(nextReq.req, nextReq.res);

}

function getBaseUrl(fullUrl) {

    return fullUrl.split('?')[0];
    
}