require('./config/db');

const express = require("express");


const app = express();

app.use(express.json());

const port = process.env.PORT || 3050;

const UserRouter = require('./api/User');
// for accepting post form data

const bodyParser = require('express').json;

app.use('/user',UserRouter);

app.use(bodyParser());

app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
})