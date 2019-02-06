

const mocks = require('./src/mocks');
const restMocks = require('./src/RestMocks');
const soap = require('soap');
const express = require('express');
const fetch = require('node-fetch');
const xmlparser = require('express-xml-bodyparser');
const bodyParser = require('body-parser');
const uid = require("uid");
const morgan = require('morgan');
const db = require("./src/db").db;
const dpfDB= require("./src/modules/DPF/dpfDB").dpfDB;

process.env.PORT = process.env.PORT || 8001;

let app = express();

app.use(morgan('combined'));


let restString = restMocks.map((item) => item.routes)
    .reduce((accumulator, current) => accumulator.concat(current))
    .map((item) => `${item.method} http://localhost:${process.env.PORT}${item.path}`);

let soapString = mocks
    .map((item) => `http://localhost:${process.env.PORT}${item.pathName}?wsdl`);

app.get('/', (req, res) => {
    res.send(`
            <html style="font-family: Comic Sans MS;">
                <body>
                    <h1>MOVE Mocks<h1>
                        <h3>Mocks:<h3>
                            <ul> ${ restString.map((url) => `<li>${url}</li>`).join('') }</ul>
                        <h3>WSDLs:<h3>
                            <ul> ${ soapString.map((url) => `<li><a href="${url}">${url}</a></li>`).join('') }</ul>
                             
                        <h3>Received DPO messages</h3>
                        <ul> ${ [...db].map(([key, value]) => `<li>Receiver: ${key} </li>` ).join('') }</ul>
                       
                       
                       <h3>Received DPF messages</h3>
                        <ul> ${[...dpfDB].map(([key, value]) => {
                        return `<li>Receiver: ${key}</li>`;    
                        } ).join('') }</ul>
                       
                </body>
            </html>
    `);
});

//File info: ${JSON.stringify(value, null, 2)}


// Set up REST mocks:
restMocks.forEach((mock) => {
    mock.routes
        .forEach((item) => {
            if (item.method === 'GET'){
                app.get(item.path, item.responseFunction)
            } else if (item.method === 'POST') {

                if (item.middleware){
                    app.post(item.path, item.middleware, item.responseFunction);
                } else {
                    app.post(item.path, item.responseFunction);
                }
            }
    });
});

// Set up SOAP mocks:

// Fetch the WSDLs:
Promise.all(mocks.map((mock) => fetch(mock.wsdlUrl) ))
    .then((res) => {
        // Map the WSDL to the mock:
        Promise.all(res.map((res) => res.text()))
            .then((wsdls) => {
                wsdls.forEach((wsdl, idx) => {
                    mocks[idx].wsdl = wsdl;
                });

                // Set up the listeners:
                app.listen(process.env.PORT, () => {
                    mocks.forEach((mock) => {
                        soap.listen(app, mock.pathName, mock.service, mock.wsdl);
                    })
                });
        });
});

console.log(`Mocks running on http://localhost:${process.env.PORT}`);
console.log('REST mocks: \n');
console.log(restString.join('\n'));
console.log("\n");
console.log('SOAP mocks: \n');
console.log(soapString.join('\n'));


module.exports = app;