// BOB, THE BUILD TOOL

const fs = require("fs");
const path = require("path");

const minify = require("minify");
const terser = require("terser");

const logger = require("./private_modules/logger");
logger.set("x-verbose", true);

const buildConfigDir = process.env.BUILD_CONFIG || path.join(__dirname, ".build_config");
const deleteProdDir = process.argv.includes("--delete-prod-dir") || process.argv.includes("-dp");
const ignoreErrors = process.argv.includes("--ignore-errors") || process.argv.includes("-ie");
const stopOnWarning = process.argv.includes("--stop-on-warning") || process.argv.includes("-sw");

if (!fs.existsSync(path.join(buildConfigDir, "minify.json"))) {
    logger.error("minify.json file missing. Shutting down...");
    logger.close();
    process.exit(1);
}

build();

async function build() {
    logger.log("--BOB-- Starting the build process...");
    
    logger.log("--BOB-- Minifying the files...");
    await minifyFiles();
    logger.log("--BOB-- Minification done.");
    
    logger.log("--BOB-- Build done.");
}


async function minifyFiles() {
    const files = JSON.parse(fs.readFileSync(path.join(buildConfigDir, "minify.json")));
    const devBase = path.resolve(files.devBase), prodBase = path.resolve(files.prodBase);
 
    if (deleteProdDir)
        fs.rmdirSync(path.resolve(prodBase), {
            recursive: true
        });

    if (!fs.existsSync(path.resolve(prodBase)))
        fs.mkdirSync(path.resolve(prodBase));
    
    for (const f of files.fileList) {
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        if (f.endsWith(".html") || f.endsWith(".css")) {
            fs.writeFileSync(path.join(prodBase, f), await minify(path.join(devBase, f)));
        } else if (f.endsWith(".js")) {
            const minified = terser.minify(fs.readFileSync(path.join(devBase, f)).toString(), {
                mangle: {
                    toplevel: true
                },
                warnings: true
            });

            if (minified.error) {
                logger.log(`An error occured while minifying the following file: ${f}`);
                logger.dir(minified.error);

                if (!ignoreErrors) {
                    logger.log(`Shutting down...`);
                    logger.close();
                    process.exit(2);
                }
            }

            if (minified.warnings) {
                logger.log(`Warning from the following file: ${f}`);
                logger.log(minified.warnings);

                if (stopOnWarning) {
                    logger.log(`Shutting down...`);
                    logger.close();
                    process.exit(3);
                }
            }

            fs.writeFileSync(path.join(prodBase, f), minified.code);
        }
    }
}