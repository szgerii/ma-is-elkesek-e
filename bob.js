// BOB, THE BUILD TOOL

const fs = require("fs");
const path = require("path");
const { EOL } = require("os");

const minify = require("minify"); // HTML and CSS minification
const terser = require("terser"); // JS minification
const zlib = require("zlib"); // gzip compression

const imagemin = require("imagemin");
const imageminPNG = require("imagemin-pngquant");
const imageminSVG = require("imagemin-svgo");

const logger = require("./private_modules/logger");
logger.set("x-verbose", true);

const deleteProdDir = process.argv.includes("--delete-prod-dir") || process.argv.includes("-dp");
const ignoreErrors = process.argv.includes("--ignore-errors") || process.argv.includes("-ie");
const stopOnWarning = process.argv.includes("--stop-on-warning") || process.argv.includes("-sw");

const buildConfigDir = process.argv.includes("--build-config") ? path.resolve(process.argv[process.argv.indexOf("--build-config") + 1]) : path.join(__dirname, ".build_config");
const minifyPath = process.argv.includes("--min") ? path.resolve(process.argv[process.argv.indexOf("--min") + 1]) : path.join(buildConfigDir, "minify.json");
const compressTextPath = process.argv.includes("--tcomp") ? path.resolve(process.argv[process.argv.indexOf("--tcomp") + 1]) : path.join(buildConfigDir, "compress-text.json");
const compressImagePath = process.argv.includes("--icomp") ? path.resolve(process.argv[process.argv.indexOf("--icomp") + 1]) : path.join(buildConfigDir, "compress-image.json");

const prodBase = process.argv.includes("--prod-dir") ? path.resolve(process.argv[process.argv.indexOf("--prod-dir") + 1]) : path.resolve("dist");
const devBase = process.argv.includes("--dev-dir") ? path.resolve(process.argv[process.argv.indexOf("--dev-dir") + 1]) : path.resolve("src");

build();

/**
 * Runs the build process
 */
async function build() {
    if (deleteProdDir) {
        fs.rmdirSync(path.resolve(prodBase), {
            recursive: true
        });
    }

    logger.log("--BOB-- Starting the build process..." + EOL);
    
    logger.log("--BOB-- Minifying files..." + EOL);
    const minCount = await minifyFiles();
    logger.log(`--BOB-- Minification done. Successfully minified ${minCount} file${minCount > 1 ? "s" : ""}.` + EOL);
    
    logger.log("--BOB-- Compressing text files..." + EOL);
    const textCompCount = await compressTextFiles();
    logger.log(`--BOB-- Text file compression done. Successfully compressed ${textCompCount} file${textCompCount > 1 ? "s" : ""}.` + EOL);
    
    logger.log("--BOB-- Compressing image files..." + EOL);
    const imgCompCount = await compressImageFiles();
    logger.log(`--BOB-- Image file compression done. Successfully compressed ${imgCompCount} file${imgCompCount > 1 ? "s" : ""}.` + EOL);
    
    logger.log("--BOB-- Build done." + EOL);
}

/**
 * Minifies the files listed in minifyPath
 * @returns {Number} - the number of files successfully minified
 */
async function minifyFiles() {
    if (!fs.existsSync(minifyPath)) {
        logger.error("--BOB-- Minification config file not found. Shutting down...");
        logger.close();
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(minifyPath));

    if (!fs.existsSync(path.resolve(prodBase)))
        fs.mkdirSync(path.resolve(prodBase));

    let minifiedCounter = 0;
    
    for (const f of files) {
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        if (f.endsWith(".html") || f.endsWith(".css")) {
            fs.writeFileSync(path.join(prodBase, f), await minify(path.join(devBase, f)));
            minifiedCounter++;
        } else if (f.endsWith(".js")) {
            const minified = terser.minify(fs.readFileSync(path.join(devBase, f)).toString(), {
                mangle: {
                    toplevel: true
                },
                warnings: true
            });

            if (minified.error) {
                logger.log(`--BOB-- An error occured while minifying the following file: ${f}`);
                logger.dir(minified.error);

                if (!ignoreErrors) {
                    logger.log(`--BOB-- Build failed. Shutting down...${EOL}`);
                    logger.close();
                    process.exit(2);
                }
            }

            if (minified.warnings) {
                logger.log(`--BOB-- Warning(s) from the following file: ${f}`);

                for (const warning of minified.warnings) {
                    logger.log(warning);
                }

                console.log();

                if (stopOnWarning) {
                    logger.log(`--BOB-- Build failed. Shutting down...`);
                    logger.close();
                    process.exit(3);
                }
            }

            fs.writeFileSync(path.join(prodBase, f), minified.code);
            minifiedCounter++;
        }
    }

    return minifiedCounter;
}

/**
 * Compresses the text files listed in compressTextPath
 * @returns {Number} - the number of files successfully compressed
 */
async function compressTextFiles() {
    if (!fs.existsSync(compressTextPath)) {
        logger.error("--BOB-- Text compression config file not found. Shutting down...");
        logger.close();
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(compressTextPath));

    let compCounter = 0;

    for (const f of files) {
        if (!f.endsWith(".html") && !f.endsWith(".css") && !f.endsWith(".js"))
            continue;

        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        const compressed = zlib.deflateSync(fs.readFileSync(path.join(devBase, f)));
        fs.writeFileSync(path.join(prodBase, f), compressed);

        compCounter++;

        logger.log(`--BOB-- Text file compression: ${compCounter}/${files.length} (${compCounter / (files.length / 100)}%) done`);
    }

    return compCounter;
}

/**
 * Compresses the image files listed in compressImagePath
 * @returns {Number} - the number of files successfully compressed
 */
async function compressImageFiles() {
    if (!fs.existsSync(compressImagePath)) {
        logger.error("--BOB-- Image compression config file not found. Shutting down...");
        logger.close();
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(compressImagePath));

    let compCounter = 0;

    for (const f of files) {
        if (!f.endsWith(".png") && !f.endsWith(".svg"))
            continue;
        
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        const compressed = await imagemin([path.join(devBase, f)], {
            plugins: [
                imageminPNG({
                    quality: [0.6, 0.75]
                }),
                imageminSVG()
            ]
        });

        fs.writeFileSync(path.join(prodBase, f), compressed[0].data);
        
        compCounter++;

        logger.log(`--BOB-- Image file compression: ${compCounter}/${files.length} (${compCounter / (files.length / 100)}%) done`);
    }

    return compCounter;
}