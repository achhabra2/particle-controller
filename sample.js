var obj = { event: 'motion-detected',
  data: 'PSTX Conference Room',
  published_at: '2017-04-10T16:11:06.229Z',
  coreid: '46001f000e51353532343635' };
  
var Room = require('./roomModel');
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://docker.chhab.rocks:32768');

var db = mongoose.connection;

var compareTime = (time) => {
    var currentTime = new Date();
    var previousTime = new Date(time);
    var diff = currentTime - previousTime;
    
    var seconds= Math.floor((diff/1000)%60);
    var minutes= Math.floor((diff/(1000*60))%60);
    var hours= Math.floor((diff/(1000*60*60))%24);
    var difference = {
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
    return difference;
};


db.once('open', function() {
  var availableRooms = [];
  var displayList;
        Room.find({}).exec()
        .then((rooms) => {
            rooms.forEach( room => {
              var diff = compareTime(room.lastSeen);
              if(diff.minutes >= 5)
                availableRooms.push(room);
            });
            if(availableRooms.length > 0) {
              availableRooms.forEach( room => {
                if(!displayList)
                  displayList = 'The following rooms have been vacant for longer than 5 minutes: ';
                displayList += '`' + room.location + '` ';
              });
            }
            else {
              displayList = 'Sorry all rooms are occupied at this time. ';
            }
          console.log(displayList);
        });
});