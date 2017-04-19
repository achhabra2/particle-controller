var Room = require('./roomModel');
var Promise = require('promise');

// Create a device only if one does not exist already. 
var createDevice = ( event ) => {
    var newRoom = new Room( {
        deviceId: event.coreid,
        displayName: event.data,
        location: event.data,
        lastSeen: event.published_at
    });
    return newRoom.save();
};

// Update device object with Particle.Publish event data
var updateDevice = ( event ) => {
    // Will find device by location field
    var condition = {
        location: event.data
    };
    // Update the lastSeen field
    var update = {
        lastSeen: event.published_at
    };
    // Build a promise that will resolve the db find and update query
    return new Promise ( (resolve, reject) => {
        var query = Room.findOneAndUpdate(condition, update);
        query.exec().then((room, err) =>{
            if(err)
                reject(err);
            if(room) {
                resolve(room);
            }
            else
                reject('Could not update room. ');
        });
    });
};

// Check to see if we have a match in our database and return the matched object
var getDevice = ( event ) => {
    return new Promise ( (resolve, reject) => {
        var query = Room.findOne({'deviceId': event.coreid});
        query.exec().then((findRoom, err) =>{
            if(err)
                reject(err);
            else
                resolve(findRoom);
        });
    });
};

var checkLocation = ( query ) => {
    var location;
    if (typeof query == 'string')
        location = query;
    if (typeof query == 'object')
        location = query.data;
    return new Promise ( (resolve, reject) => {
    var dbQuery = Room.findOne({location: location});
    dbQuery.exec().then((findRoom, err) =>{
        if(err)
            reject(err);
        if(!findRoom)
            resolve(false);
        else
            resolve(true);
        });
    });
};

exports.handleMotion = ( event ) => {
    var checkEvent = event;
    return checkLocation(checkEvent)
    .then( (exists) => {
        if(exists)
            return updateDevice(checkEvent);
        else
            return createDevice(checkEvent);
    });
};

// Check to see if we have a match in our database
var getDeviceStatus = ( location ) => {
    var condition = {
        location: location
    };
    return new Promise ( (resolve, reject) => {
      var query = Room.findOne(condition);
      query.exec()
      .then( (room) =>{
        var difference = compareTime(room.lastSeen);
        
        var timeString = "It has been: " + difference.hours + "Hr  " + difference.minutes + "Min  " + difference.seconds + "Sec, since someone was last seen in the *" + location + "*. ";
        resolve(timeString);
        console.log(timeString);
      })
      .catch( (err) =>{
          console.error(err);
          reject('No Device Found');
      });
    });
};

var getAvailableRoom = ( ) => {
    return new Promise( (resolve, reject) => {
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
              displayList = 'Sorry *all* rooms are occupied at this time. ';
            }
          resolve(displayList);
        })
        .catch( err => {
            reject(err);
        });
    });
};


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

exports.handleApiaiReq = ( result ) => {

    var action = result.action;
    var parameters = result.parameters;
    
    if(action == 'getRoomStatus') {
       return checkLocation(parameters.roomName).then((exists) =>{
            if(exists) {
                return getDeviceStatus(parameters.roomName);
            }
            else {
                return new Promise((resolve, reject) => {
                    resolve('Sorry there are no available rooms at this time. ');
                });
            }
        });
    }
    
    if(action == 'getAvailableRoom') {
        console.log('Getting Available Rooms: ');
        return getAvailableRoom();
    }
};