const   http  = require('http'),
        fs    = require('fs');

const PORT = 1104 || process.env.PORT;
const server = http.createServer(router);

// 0 - index.html | 1 - styles.css | 2 - script.js
let files = [];

const DOS_BLOCK_TIMEOUT = 0.5 * 60000, DOS_PROTECTION_TIMEOUT = 0.1 * 60000, DOS_PLUS_TIMEOUT = 0.1 * 60000, DOS_MAX_REQUEST = 100;
let dosProtection = {};

start();

function start() {
    files.push(fs.readFileSync(__dirname + "/public/index.html"));
    files.push(fs.readFileSync(__dirname + "/public/styles.css"));
    files.push(fs.readFileSync(__dirname + "/public/script.js"));

    server.listen(PORT);
    console.log(`Server listening on port ${PORT}`);
}

function router(req, res) {
    console.log(dosProtection);

    if (dosProtection[req.connection.remoteAddress] === undefined)
        dosProtection[req.connection.remoteAddress] = {reqCount: 0, blocked: false, timeOfBlock: -1, blockTimeout: 0, numOfBlocks: 0};

    if (dosProtection[req.connection.remoteAddress].reqCount > DOS_MAX_REQUEST) {
        if (dosProtection[req.connection.remoteAddress].blocked) {
            res.end(`Too many requests were sent from this IP address recently, so it has been blocked for ${dosProtection[req.connection.remoteAddress].timeOfBlock} minutes`);

            if (Date.now() - dosProtection[req.connection.remoteAddress].timeOfBlock > dosProtection[req.connection.remoteAddress].blockTimeout) {
                dosProtection[req.connection.remoteAddress].blocked = false;
                dosProtection[req.connection.remoteAddress].timeOfBlock = -1;
                dosProtection[req.connection.remoteAddress].blockTimeout = 0;
                dosProtection[req.connection.remoteAddress].reqCount = 0;
            } else
                dosProtection[req.connection.remoteAddress].blockTimeout += DOS_PLUS_TIMEOUT * dosProtection[req.connection.remoteAddress].numOfBlocks;
        } else {
            dosProtection[req.connection.remoteAddress].blocked = true;
            dosProtection[req.connection.remoteAddress].timeOfBlock = Date.now();
            dosProtection[req.connection.remoteAddress].blockTimeout = DOS_BLOCK_TIMEOUT * ++dosProtection[req.connection.remoteAddress].numOfBlocks;
            console.log(`DoS Block Cleared for ${req.connection.remoteAddress}`);
        }
        if (!dosProtection[req.connection.remoteAddress].blocked)
            return;
    } else {
        dosProtection[req.connection.remoteAddress].reqCount = dosProtection[req.connection.remoteAddress].reqCount + 1 || 1;
        setTimeout(() => {
            if (!dosProtection[req.connection.remoteAddress].blocked)
               dosProtection[req.connection.remoteAddress].reqCount--;
        }, DOS_PROTECTION_TIMEOUT);
    }

    if (req.method === "GET") {
        switch (req.url) {
            case "/":
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(files[0]);
                break;
            
            case "/styles.css":
                res.writeHead(200, {"Content-Type": "text/css"});
                res.end(files[1]);
                break;
            
            case "/script.js":
                res.writeHead(200, {"Content-Type": "text/javascript"});
                res.end(files[2]);
                break;

            default:
                res.writeHead(404, {"Content-Type": "text/html"});
                res.end("404: Page Not Round");
                break;
        }
    } else {
        res.writeHead(405, {"Content-Type": "text/html"});
        res.end(`405: Inappropriate request method (${req.method})`);
    }
}