const mongoose = require('mongoose');
const userSchema = mongoose.Schema({
    username:String,
    name:String,
    email:String,
    password:String
})

module.export = mongoose.model("user", userSchema);