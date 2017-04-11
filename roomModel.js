var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Defining MongoDB Schema for the users
var roomSchema = new Schema({
    displayName: String,
    deviceId: String, 
    location: String,
    lastSeen: Date,
    timeZone: Number,
    createdOn: { 
        type: Date, 
        default: Date.now()
    }
});

module.exports = mongoose.model('room', roomSchema);