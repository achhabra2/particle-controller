'use strict';

const Room = require( './roomModel' );
const Promise = require( 'promise' );

// Create a device only if one does not exist already.
var createDevice = ( event ) => {
    let newRoom = new Room( {
        deviceId: event.coreid,
        displayName: event.data,
        location: event.data,
        lastSeen: event.published_at
    } );
    return newRoom.save();
};

// Update device object with Particle.Publish event data
var updateDevice = ( event ) => {
    // Will find device by location field
    let condition = {
        location: event.data
    };
    // Update the lastSeen field
    let update = {
        lastSeen: event.published_at
    };
    // Build a promise that will resolve the db find and update query
    let query = Room.findOneAndUpdate( condition, update );
    return query.exec();
};

// Check to see if we have a match in our database and return the matched object
var getDevice = ( event ) => {
    return new Promise( ( resolve, reject ) => {
        var query = Room.findOne( {
            'deviceId': event.coreid
        } );
        query.exec().then( ( findRoom, err ) => {
            if ( err )
                reject( err );
            else
                resolve( findRoom );
        } );
    } );
};

var checkLocation = ( query ) => {
    var location;
    if ( typeof query == 'string' )
        location = query;
    if ( typeof query == 'object' )
        location = query.data;
    return new Promise( ( resolve, reject ) => {
        var dbQuery = Room.findOne( {
            location: location
        } );
        dbQuery.exec().then( ( findRoom, err ) => {
            if ( err )
                reject( err );
            if ( !findRoom )
                resolve( false );
            else
                resolve( true );
        } );
    } );
};

var handleMotion = ( event ) => {
    var checkEvent = event;
    return checkLocation( checkEvent )
        .then( ( exists ) => {
            if ( exists )
                return updateDevice( checkEvent );
            else
                return createDevice( checkEvent );
        } );
};

// Check to see if we have a match in our database
var getDeviceStatus = ( location ) => {
    var condition = {
        location: location
    };
    return new Promise( ( resolve, reject ) => {
        var query = Room.findOne( condition );
        query.exec()
            .then( ( room ) => {
                var difference = compareTime( room.lastSeen );

                var timeString = "It has been: **";
                if ( difference.days > 0 )
                    timeString += difference.days + "**_D_  **";
                if ( difference.hours > 0 )
                    timeString += difference.hours + "**_Hr_  **";
                if ( difference.minutes > 0 )
                    timeString += difference.minutes + "**_Min_  **";
                if ( difference.seconds > 0 )
                    timeString += difference.seconds;
                timeString += "**_Sec_, since someone was last seen in **" + location + "**. ";
                resolve( timeString );
                console.log( timeString );
            } )
            .catch( ( err ) => {
                console.error( err );
                reject( 'No Device Found' );
            } );
    } );
};

var getAvailableRoom = () => {
    return new Promise( ( resolve, reject ) => {
        var availableRooms = [];
        var displayList;
        Room.find( {} ).exec()
            .then( ( rooms ) => {
                rooms.forEach( room => {
                    var diff = compareTime( room.lastSeen );
                    // console.log( diff );
                    if ( diff.minutes >= 5 || diff.days > 0 || diff.hours > 0 )
                        availableRooms.push( room );
                } );
                // console.log( 'Logging AvailableRooms: ' );
                // console.log( availableRooms );
                if ( availableRooms.length > 0 ) {
                    availableRooms.forEach( room => {
                        if ( !displayList )
                            displayList = 'The following rooms have been vacant for longer than 5 minutes:<ol>';
                        displayList += '<li>' + room.location + '</li>';
                    } );
                    displayList += '</ol>';
                } else {
                    displayList = 'Sorry ``all`` rooms are occupied at this time. ';
                }
                resolve( displayList );
            } )
            .catch( err => {
                reject( err );
            } );
    } );
};

var listRoom = () => {
    return new Promise( ( resolve, reject ) => {
        var availableRooms = [];
        var displayList;
        Room.find( {} ).exec()
            .then( ( rooms ) => {
                rooms.forEach( room => {
                    if ( !displayList )
                        displayList = 'Here are all the rooms I am currently tracking:<ol>';
                    displayList += '<li>' + room.location + '</li>';
                } );
                displayList += '</ol>';
                resolve( displayList );
            } )
            .catch( err => {
                reject( err );
            } );
    } );
};

var getBusyRoom = () => {
    return new Promise( ( resolve, reject ) => {
        var availableRooms = [];
        var displayList;
        Room.find( {} ).exec()
            .then( ( rooms ) => {
                rooms.forEach( room => {
                    var diff = compareTime( room.lastSeen );
                    if ( diff.minutes < 5 && diff.days == 0 && diff.hours == 0 )
                        availableRooms.push( room );
                } );
                if ( availableRooms.length > 0 ) {
                    availableRooms.forEach( room => {
                        if ( !displayList )
                            displayList = 'The following rooms have seen activity in the last 5 minutes: <ol>';
                        displayList += '<li>' + room.location + '</li>';
                    } );
                    displayList += '</ol>';
                } else {
                    displayList = 'All rooms are currently free.';
                }
                resolve( displayList );
            } )
            .catch( err => {
                reject( err );
            } );
    } );
};

var compareTime = ( time ) => {
    var currentTime = new Date();
    var previousTime = new Date( time );
    var diff = currentTime - previousTime;

    var seconds = Math.floor( ( diff / 1000 ) % 60 );
    var minutes = Math.floor( ( diff / ( 1000 * 60 ) ) % 60 );
    var hours = Math.floor( ( diff / ( 1000 * 60 * 60 ) ) % 24 );
    var days = Math.floor( ( diff / ( 1000 * 60 * 60 ) ) / 24 );
    var difference = {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
    return difference;
};

var handleApiaiReq = ( result ) => {

    var action = result.action;
    var parameters = result.parameters;

    if ( action == 'getRoomStatus' ) {
        return checkLocation( parameters.roomName ).then( ( exists ) => {
            if ( exists ) {
                return getDeviceStatus( parameters.roomName );
            } else {
                return new Promise( ( resolve, reject ) => {
                    resolve( 'Sorry there are no available rooms at this time. ' );
                } );
            }
        } );
    }

    if ( action == 'getAvailableRoom' ) {
        console.log( 'Getting Available Rooms: ' );
        return getAvailableRoom();
    }
    if ( action == 'getBusyRoom' ) {
        console.log( 'Getting Busy Rooms: ' );
        return getBusyRoom();
    }
    if ( action == 'listRoom' ) {
        console.log( 'Listing All Rooms: ' );
        return listRoom();
    }
};

module.exports = {
    handleApiaiReq: handleApiaiReq,
    handleMotion: handleMotion
};
