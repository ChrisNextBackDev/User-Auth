const express = require('express');

const router= express.Router();

//mongo db user model
const User = require('../models/User')

//email verification handler
const nodemailer = require('nodemailer');

//unique string handler
const {v4: uuidv4} = require('uuid')

//env variable
require('dotenv').config();


//mongo db userVerification model
const UserVerification = require('../models/UserVerification')


//password handler
const bcrypt = require('bcrypt');


//nodemailer ish
let transporter = nodemailer.createTransport({
    service: 'gmail.com',
    auth : {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD

    }
})


//testing the transporter

transporter.verify((error, success) =>{
    if (error){
        console.log(error);
    }else{
        console.log('I am ready');
        console.log(success);
    }
})

//signup
router.post('/signup', (req, res) => {
    if (!req.body) {
        return res.status(400).send('Request body is missing');
      }
      //console.log(req.body);
    let {name, email, password, dateOfBirth} = req.body;
    //trimming of whitespaces
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth= dateOfBirth.trim();

    //check if any of them is empty
    if (name =="" || email =="" || password=="" || dateOfBirth==""){
        res.json({
           message: 'Empty input field'
        })
        res.status(400)
    } else if (!/^[a-zA-Z ]*$/.test(name)){
        res.json({
            message: 'Invalid name'
        })
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            message: 'Invalid email'
        })
    } else if(!new Date(dateOfBirth).getTime()){
        res.json({
            message: 'Invalid DOB'
        })
    }else if (password.length < 8){
        res.json({
            message: 'Passsword must be greater than eight characters'
        })
    
    }else {
        //signup process
        //first check whether the user already exists
        User.find({email}).then(result =>{
            if(result.length > 0){
                res.json({
                   message: 'User already exist' 
                })
            }else{
               //save the user to the password 
               //first hash the password
               const salt = 5;
               bcrypt.hash(password,salt).then(hashedPassword =>{
                //create a new user using the user model
                const newUser = new User({
                    name,
                    email,
                    password: hashedPassword,
                    dateOfBirth,
                    verified:false,
                });
                newUser.save().then(result =>{

                    // handling verification
                    sendVerificationEmail(result, res);
                    //res.status(200);
                //     res.json({
                //         message: 'user created succesfully',
                //         data : result,
                // });
            }).catch(err =>{
                    console.log(err);
                    res.json({
                        message: 'error occured while savng user'
                    })
                })

               }).catch(err=>{
                console.log(err);
                res.json({
                    message: 'Error Occured while hashing password'
                })
               })
           // })
        }
        }).catch(err =>{
            console.log(err);
            res.json({
                message: 'an error occur while checking existing user'
            })
        })
    }
});


//send verification function
// for the result, we want to destruucture the id and email
const sendVerificationEmail = ({_id, email}, res) => {
    //the above _id is the id from our mongodb database
    //using localhost to be the url for sending to the email

    const currentUrl = 'http://localhost:5000/';
    const uniqueString = uuidv4() + _id;
    //setting the mail options for nodemailer

    const mailOptions = {
        from: {
            address: process.env.AUTH_EMAIL,
            name: 'Group 3 Lab One Project'
        },
        to: email,
        subject: 'Verify your email',
        //add html property
        html: `<p>Verify your email address to complete your sign up and login to your account</p>
        <p>This link expires in <b> 6 hours.</b></p><p> Click here <a href = ${currentUrl + "user/verify/" + _id + "/" + uniqueString}></a> to proceed</p>`
    }
    //we need to hash the unique string and store it in the user verification model before sending verification link
    const salt = 10;
    bcrypt
    .hash(uniqueString, salt)
    .then((hashedUniqueString)=>{
        //create new verification model user
        const newVerification = newVerification({
            userId: _id,
            uniqueString:hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000,
        })
        newVerification
        .save()
        //send the verification link sing the transporter
        .then(() =>{
            transporter.sendMail(mailOptions)
            .then(()=>{
                res.status(200);
                res.json({
                 message: 'Verification link sent succesfully'
        })
            })
            .catch((error)=>{
                console.log(error);
                res.status(400);
                res.json({
                message: 'Error occured while sending mail'
        })
            })
        })
        .catch((error)=>{
            console.log(error);
            res.status(400);
            res.json({
                message: 'Error occured while saving to user verification'
        })
        })
    })
    .catch(()=>{
        res.status(400);
        res.json({
            message: 'Error occured while hashing the unique string'
        })
    })
}


//route to handle the link that the user will click and it will be a get request
router.get("/verify/:userId/:uniqueString", (req, res) =>{
    // fetch the id and the unique string that you passed during email verification link
    let {userId, uniqueString} = req.params;
    //chech wether the userverification exist using the id
    UserVerification.find({userId}
        .then((result)=>{
            if(result.length>0){
                //user verification properties exist, we can proceed
            }else{
                //user verification model couldn't find such  userid
            }
        })
        .catch((error) =>{
            console.log(error);
            //frontend guys can do a display page here to return a customized error message
            res.json({
                message: 'Error occur while handling verification link'
            })
        })
    )

})




//signin
router.post('/signin', (req, res) =>{
    let {email, password} = req.body;
    //trimming of whitespaces
    email = email.trim();
    password = password.trim();

    if(email == ""||password ==""){
        res.status(400);
        res.json({
            message: 'Email or Password cannot be empty'
        })
    }else{
        //check if the user already exist
        User.find({email}).then(data =>{
            if(data.length>0){
                //compare the input password with the hashed password
                const hashedPassword = data[0].password;
                bcrypt.compare(password, hashedPassword).then(result =>{
                    if(result){
                        res.status(200);
                        res.json({
                            message: 'signed in successfully',
                            data:data
                        })   
                    } else{
                        res.status(400);
                        res.json({
                            message: 'Invalid Email or Password'
                        })
                    }
                })
                .catch(err => {
                    console.log(err);
                    res.status(400);
                    res.json({
                        message: 'Error occur while signing in'
                    })
                })

            }else{
                res.status(400);
                res.json({
                    message: 'User not found/Invalid credentials'
                })
            }


        }).catch(err =>{
            console.log(err);
            res.json({
                message: 'Error occured while checking user'
            })
        })
    }
})

module.exports= router;