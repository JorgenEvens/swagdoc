#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const URL = require('url');

const open = require('open');
const express = require('express');
const serveIndex = require('serve-index');

const EDITOR = path.join(__dirname, './static/index.html');
const SOURCE = path.resolve(process.cwd(), process.argv[2] || '.');
const SWAGGER_EDITOR = path.dirname(require.resolve('swagger-editor-dist'));
const EMPTY_FILE = fs.readFileSync(path.resolve(__dirname, './static/empty-spec.yaml'));

function isFile(file) {
    try {
        if (!fs.statSync(file).isFile())
            throw new Error('not a file');

        return true;
    } catch(e) {
        return false;
    }
}


const app = express();
const server = http.createServer(app);

// save the file from swagger-editor
app.put('/editor/spec', function (req, res, next) {
    var file = path.join(SOURCE, req.query.file);

    if (!isFile(file)) {
        return next();
    }

    var stream = fs.createWriteStream(file);
    req.pipe(stream);
    stream.on('finish', function () {
        res.end('ok');
    });

});

// retrieve the project swagger file for the swagger-editor
app.get('/editor/spec', function(req, res, next) {
    var file = path.join(SOURCE, req.query.file);

    if (!isFile(file))
        return next();

    fs.createReadStream(file).pipe(res);
});

// serve references
app.use('/ref', express.static(SOURCE));

app.get('*.ya?ml', function(req, res) {
    var url = URL.parse(req.url);
    var file = path.join(SOURCE, url.pathname);

    if (!isFile(file) && !req.query.create) {
        return res.type('text/html').end(`
            <html>
                <body>
                    <p>
                        Would you like to
                        <a href="${url.pathname}?create=1">create</a>
                        the file?
                    </p>

                    <p>Go <a href="#" onclick="history.back()">Back</a></p>
                </body>
            </html>`);
    }

    if (!isFile(file))
        fs.writeFileSync(file, EMPTY_FILE);

    fs.createReadStream(EDITOR).pipe(res);
});

// serve source files
app.use('/', express.static(SOURCE), serveIndex(SOURCE));

// serve swagger-editor
app.use('/', express.static(SWAGGER_EDITOR));

server.listen(process.env.PORT || 0, 'localhost', function () {
    const { port } = server.address();
    const url = `http://localhost:${port}/`;

    /* eslint-disable no-console */
    console.error('Starting Swagger editor.');
    console.error('URL:', url);
    /* eslint-enable */
    open(url);

});
