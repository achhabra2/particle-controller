var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('promise');
var mongoose = require('mongoose');
var Room = require('./roomController');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://docker.chhab.rocks:32768');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  Room.getDeviceStatus('PSTX Conference Room')
  .then( (timeString) => {
    res.status(200).send(timeString);
  });
});

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

app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  console.log("Particle Collector Bot Running on Port 3000");
});