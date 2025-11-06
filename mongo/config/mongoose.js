const mongoose = require('mongoose');
const debuglog = require("debug")("development:mongooseconfig");

// Corrected connection string
mongoose.connect("mongodb://127.0.0.1:27017/testingdb");

const db = mongoose.connection;

db.on("error", function(err){
    debuglog(err);
});

db.on("open", function(){
    console.log("connected to the database");
});

module.exports = db;