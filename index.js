const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
//const pg = require('pg');//.native;

var port = process.env.PORT || 8080;

var app = express()
    .use(bodyParser.urlencoded())
    .use(bodyParser.json())
    .use(cors());

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(port, function () {
    console.log('Example app listening on port 8080!');
});