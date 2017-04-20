'use strict';

// Check for production
// If development environment load .env file
if(process.env.NODE_ENV != 'production') {
  var env = require('node-env-file');
  env('./.env');
}

var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('promise');
var mongoose = require('mongoose');
var Room = require('./roomController');

// Connection Strings to MongoDB Instance
mongoose.Promise = global.Promise;
mongoose.connect(process.env.mongo).then((err) =>{
  if(err)
    console.error(err);
});


// APIAI Block
const SparkBot = require('./sparkbot');
const SparkBotConfig = require('./sparkbotconfig');
const apiai = require('apiai');
const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'false';

const APIAI_ACCESS_TOKEN = process.env.apiai_access_token;
const APIAI_LANG = 'en';
const SPARK_ACCESS_TOKEN = process.env.spark_token;


var baseUrl = process.env.public_address;

var bot;

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

function startBot() {

    console.log("Starting bot");

    const botConfig = new SparkBotConfig(
        APIAI_ACCESS_TOKEN,
        APIAI_LANG,
        SPARK_ACCESS_TOKEN);

    botConfig.devConfig = DEV_CONFIG;

    bot = new SparkBot(botConfig, baseUrl + '/webhook');
    //Commented out so webhook not created on every launch.
    bot.setupWebhook();  
}

startBot();



// Define Express Web Server with bodyparser middleware
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Hello world get command
app.get('/', (req, res) => {
  Room.handleApiaiReq({ action: 'getAvailableRoom'})
  .then( (response) => {
    res.status(200).send(response);
  });
});

// Define route for webhook integration into particle cloud
app.post('/particle', (req, res) => {
  res.status(200).end();
  console.log('Received Particle Update For: ' + req.body.coreid);
  Room.handleMotion(req.body)
  .then( (room) => {
    console.log('Updated Room: ' + room.deviceId);
  })
  .catch( (err) => {
    console.error(err);
  });
});

// Define route for webhook integration into api.ai
app.post('/apiai', (req, res) => {
    console.log('POST webhook');
    console.log(req.body.result);
    Room.handleApiaiReq(req.body.result)
    .then( (response) =>{
        // var data = {
        //     'spark': { markdown: response }
        // };
        var source = 'ParticleBot';
        var result = {
            speech: response,
            displayText: response,
            // data: data,
            source: source
        };
        res.send(result).end();
    })
    .catch((err) => {
        console.error(err);
        res.status(400).end();
    });
});

// Incoming CiscoSpark Webhook Router
app.post('/webhook', (req, res) => {
    //console.log('POST webhook');
    //Filter for cisco users and direct rooms only before passing to API.ai
    if (req.body.data.personEmail && req.body.data.personEmail.endsWith("@cisco.com")) {

        try {
            if (bot) {
                bot.processMessage(req, res);
            }
        } catch (err) {
            return res.status(400).send('Error while processing ' + err.message);
        }
    }
    else {
        res.status(200).send('Ok')
    }
});



// Start Express web server
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log("Particle Collector Bot Running on Port 3000");
});