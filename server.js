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

// Start Express web server
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log("Particle Collector Bot Running on Port 3000");
});