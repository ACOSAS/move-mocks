const { recursiveKeySearch } = require("./helper");
const hentNyeForsendelser = require('./testdata/hentNyeForsendelser')
const { PutMessage, sendforsendelsemedid, retrieveforsendelsestatus } = require("./modules/DPF/soapResponses");
const retrieveForsendelseIdByEksternRefResponse = require("./modules/DPF/retrieveForsendelseIdByEksternRef").retrieveForsendelseIdByEksternRefResponse;
const { GetAvailableFilesBasic, InitiateBrokerServiceBasic, DownloadFileStreamedBasic, UploadFileStreamedBasic } = require("./modules/DPO/responses");
const getBasicWSDL = require("./modules/DPO/BasicWsdl").getBasicWSDL;
const getBasicStreamedWsdl = require("./modules/DPO/BasicStreamedWsdl").getBasicStreamedWsdl;
const BrokerServiceExternalBasic = require("./modules/DPO/DPO").BrokerServiceExternalBasic;
const { getBrokerServiceExternalBasicWSDL } = require("./modules/DPO/DPO");
const { receiveDPV }  = require("./modules/DPV/DPV");
const config = require('./config');
const dpoMessageCache = require('./modules/DPO/dpoMessageCache');

const dpfMessageCache  = require('./modules/DPF/dpfMessageCache');

global.messageCount = 0;

const mocks = [
    {
        name: 'DPF',
        routes: [
            {
                path: '/dpf*',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.send('ok');
                }
            },
            {
                path: '/dpf*',
                method: 'POST',
                responseFunction: (req, res) => {

                    res.set('Content-type', 'application/soap+xml');

                    if (req.body["envelope"]["body"][0]["retrieveforsendelseidbyeksternref"]) {
                        res.send(retrieveForsendelseIdByEksternRefResponse(req, res));
                    } else if (req.body["envelope"]["body"][0]["retrieveforsendelsestatus"]) {

                        res.send(retrieveforsendelsestatus());
                    }
                    else if (req.body["envelope"]["body"][0]["sendforsendelsemedid"]) {
                        global.messageCount = global.messageCount + 1;

                        let forsendelsesid = recursiveKeySearch('forsendelsesid', req.body)[0][0];

                        let body = JSON.parse(JSON.stringify(req.body));

                        body["envelope"]["body"][0]["sendforsendelsemedid"][0]["forsendelse"][0]["dokumenter"][0]['data'] = "FJERNET";

                        dpfMessageCache.set(forsendelsesid, JSON.stringify(body));

                        res.send(sendforsendelsemedid());
                    }
                }
            }
        ]
    },
    {
        name: 'messageCount',

        routes: [
            {
                method: 'GET',
                path: '/messageCount',
                responseFunction: (req, res) => {
                    res.send({
                        count: global.messageCount
                    });
                }
            },
            {
                method: 'POST',
                path: '/clearCount',
                responseFunction: (req, res) => {
                    global.messageCount = 0;
                    res.send('OK');
                }
            }
        ],

    },
    {
        name: 'Noark',
        routes: [
            {
                path: '/noark*',
                method: 'POST',
                responseFunction: (req, res) => {

                    res.set('Content-type', 'text/xml');

                    if (req.headers && req.headers.soapaction === "\"http://www.arkivverket.no/Noark/Exchange/IEDUImport/PutMessage\"") {
                        res.send(PutMessage());
                    } else {
                        res.send('ding!')
                    }
                }
            }
        ]
    },
    {
        name: "KS SvarInn",
        routes: [
            {
                path: '/svarinn/mottaker/hentForsendelsefil/:forsendelseid',
                method: 'GET',
                responseFunction: (req, res) => {
                    // need stream?
                    res.download(`${__dirname}/testdata/${config.hentForsendelsefil}`)
                }
            },
            {
                path: '/svarinn/mottaker/hentNyeForsendelser',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.send(JSON.stringify(hentNyeForsendelser()));
                }
            },
            {
                path: '/svarinn/kvitterMottak/forsendelse/:forsendelseid',
                method: 'POST',
                responseFunction: (req, res) => {
                    res.send('Ok');
                }
            }
        ]
    },
    {
        name: 'DPV',
        routes: [
            {
                path: '/dpv/*',
                method: 'POST',
                responseFunction: receiveDPV
            }
        ]
    },
    {
        name: 'DPO',
        routes: [
            {
                path: '/dpo',
                    method: 'GET',
                    responseFunction: (req,res) => {

                    if (!req.query.part){
                        getBrokerServiceExternalBasicWSDL(req,res)
                    } else if (req.query.part === 'BrokerServiceExternalBasicStreamed.wsdl'){
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicStreamedWsdl());
                    } else if (req.query.part === 'BrokerServiceExternalBasic.wsdl') {
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicWSDL());
                    }
                }
            },
            {
                path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasic.svc',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.set('Content-type', 'text/xml');
                    res.send(getBasicWSDL());
                }
            },
            {
                path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasicStreamed.svc',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.set('Content-type', 'text/xml');
                    res.send(getBasicStreamedWsdl());
                }
            },
            {
                path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasicStreamed.svc',
                method: 'GET',
                responseFunction: (req,res) => {
                    if (!req.query.part){
                        getBrokerServiceExternalBasicWSDL(req,res)
                    } else if (req.query.part === 'BrokerServiceExternalBasicStreamed.wsdl'){
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicStreamedWsdl());
                    } else if (req.query.part === 'BrokerServiceExternalBasic.wsdl') {
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicWSDL());
                    }
                }
            },
            {
                path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasic.svc',
                method: 'GET',
                responseFunction: (req,res) => {
                    if (!req.query.part){
                        getBrokerServiceExternalBasicWSDL(req,res)
                    } else if (req.query.part === 'BrokerServiceExternalBasicStreamed.wsdl'){
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicStreamedWsdl());
                    } else if (req.query.part === 'BrokerServiceExternalBasic.wsdl') {
                        res.set('Content-type', 'text/xml');
                        res.send(getBasicWSDL());
                    }
                }
            },
            {
                path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasic.svc',
                method: 'POST',
                responseFunction: (req,res) => {
                    res.header('Content-type', 'text/xml');
                    if (req.headers.soapaction === "\"http://www.altinn.no/services/ServiceEngine/Broker/2015/06/IBrokerServiceExternalBasic/GetAvailableFilesBasic\"") {
                        res.send(GetAvailableFilesBasic())
                    } else if (req.headers.soapaction === "\"http://www.altinn.no/services/ServiceEngine/Broker/2015/06/IBrokerServiceExternalBasic/InitiateBrokerServiceBasic\"") {
                        let sendersreference = recursiveKeySearch('sendersreference', req.body)[0][0];
                        dpoMessageCache.set(sendersreference, JSON.stringify(req.body))
                        res.send(InitiateBrokerServiceBasic())
                    }
                }
            },
            {
              path: '/dpo/ServiceEngineExternal/BrokerServiceExternalBasicStreamed.svc',
                method: 'POST',
                responseFunction: (req, res) => {
                    res.header('Content-type', 'text/xml');
                    if (req.headers.soapaction === "\"http://www.altinn.no/services/ServiceEngine/Broker/2015/06/IBrokerServiceExternalBasicStreamed/DownloadFileStreamedBasic\"") {
                        res.send(DownloadFileStreamedBasic());
                    } else if (req.headers.soapaction === "\"http://www.altinn.no/services/ServiceEngine/Broker/2015/06/IBrokerServiceExternalBasicStreamed/UploadFileStreamedBasic\""){
                        var multiparty = require('multiparty');
                        var util = require('util');
                        var form = new multiparty.Form({
                            autoFiles: true,
                            uploadDir: __dirname + '/uploads'
                        });


                        form.parse(req);
                        console.log('laebk');

                        // form.on('part', function(part) {
                        //     // You *must* act on the part by reading it
                        //     // NOTE: if you want to ignore it, just call "part.resume()"
                        //
                        //     if (!part.filename) {
                        //         // filename is not defined when this is a field and not a file
                        //         console.log('got field named ' + part.name);
                        //         // ignore field's content
                        //         part.resume();
                        //     }
                        //
                        //     if (part.filename) {
                        //         // filename is defined when this is a file
                        //         count++;
                        //         console.log('got file named ' + part.name);
                        //         // ignore file's content here
                        //         part.resume();
                        //     }
                        //
                        //     part.on('error', function(err) {
                        //         // decide what to do
                        //     });
                        // });


                        global.messageCount = global.messageCount + 1;
                        res.send(UploadFileStreamedBasic())
                    }
                }
            },
        ]
    },
    {
        name: "SvarInn",
        routes: [
            {
                path: '/mottaker/hentNyeForsendelser',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.send([]);
                }
            }
        ]
    },
    {
        name: "Logstash",
        routes: [
            {
                path: '/logstash/*',
                method: 'POST',
                responseFunction: (req, res) => {
                    res.send('Logged');
                }
            },
            {
                path: '/logstash/*',
                method: 'GET',
                responseFunction: (req, res) => {
                    res.send('Logged');
                }
            }
        ]
    },
    {
        name: "DPE Service bus",
        routes: [
            {
                path: '/dpe-service-bus/*',
                method: 'POST',
                responseFunction: (req, res) => {
                    res.send('Logged');
                }
            }
        ]
    }
];

module.exports = mocks;