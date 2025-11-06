const express = require('express');
const app = express();
const mongooseconnection = require("./config/mongoose");
const userModel = require("./model/user");
const debuglog = require("debug")("development:app");

app.get("/", function (req, res, next) {
    res.send("Welcome to the app!");
});

app.get("/create", async function (req, res, next) {
    let createduser = await userModel.create({
        username: "vishant8491",
        name: "vishant",
        email: "vishu8491@example.com",
        password: "1234"
    });

    debuglog("user created");
    res.send(createduser);
});

app.listen(3000);