const express = require('express');

const router= express.Router();

//mongo db user model
const UserQuiz = require('../models/User')

//email verification handler
const nodemailer = require('nodemailer');

//unique string handler
const {v4: uuidv4} = require('uuid')

//env variable
require('dotenv').config();


//mongo db userVerification model
const UserVerification = require('../models/UserVerification')

//mongo db PasswordReset model
const PasswordReset = require('../models/PasswordReset')


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
        UserQuiz.find({email}).then(result =>{
            if(result.length > 0){
                res.json({
                   message: 'User already exist' 
                })
            }else{
               //save the user to the password 
               //first hash the password
               const salt = 5;
               bcrypt.hash(password,salt).then(hashedPassword =>{
                console.log('i am okay here');
                //create a new user using the user model
                const newUser = new UserQuiz({
                    name,
                    email,
                    password: hashedPassword,
                    dateOfBirth,
                    verified:false,
                });
                console.log('i am okay here too');
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

    const currentUrl = 'http://localhost:3050/';
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
        <p>This link expires in <b> 6 hours.</b></p><p> Click here <a href="${currentUrl + 'user/verify/' + _id + '/' + uniqueString}">${currentUrl + 'user/verify/' + _id + '/' + uniqueString}</a> </p>`
    }
    //we need to hash the unique string and store it in the user verification model before sending verification link
    const salt = 10;
    bcrypt
    .hash(uniqueString, salt)
    .then((hashedUniqueString)=>{
        //create new verification model user
        const newVerification = new UserVerification({
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
                message: 'Error occured while sending verification mail'
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


//route to handle the link that the user will click and it will be a fetch us the userid and unique string for comparison
router.get("/verify/:userId/:uniqueString", (req, res) =>{
    // fetch the id and the unique string that you passed during email verification link
    let {userId, uniqueString} = req.params;
    //chech wether the userverification exist using the id
    UserVerification.find({userId})
        .then((result)=>{
            if(result.length>0){
                //user verification properties exist, we can proceed
                //check whether the user record has expired

                const {expiresAt} = result[0];
                const hashedUniqueString = result[0].uniqueString;// for comparison

                if(expiresAt < Date.now()){
                    // so once it has expired, we will go ahead and delete it from the user verification model
                    UserVerification
                    .deleteOne({userId})
                    .then((result) => {
                        //why are we actually deleting the user withexpired unique string? Because, it has expired and was not clicked
                        UserQuiz.deleteOne({_id: userId})
                        .then(()=>{
                            res.json({
                                message: 'Link has expired, signup again'
                            })
                        })
                        .catch((error)=>{
                            console.log(error);
                            res.json({
                                message: 'Error occur while deleting the user'
                            })
                        })
                    })
                    .catch((error)=>{
                        console.log(error);
                        res.json({
                            message: 'Error occur while deleting the userverification model'
                        })
                    })
                }else{
                    //what happens when the user verification has not expires/ still active
                    //first compare the unaltered unique string with the one stored in the database(hashed one)
                    //we are getting the unique string from the link as it is attache there
                    bcrypt
                    .compare(uniqueString, hashedUniqueString)
                    .then(result =>{
                        if(result){
                            //string matches
                            //update the user record and set the verified to true
                            UserQuiz
                            .updateOne({_id:userId}, {verified:true})
                            .then(()=>{
                                //once updated, we have to delete the userverification model
                                UserVerification
                                .deleteOne({userId})
                                .then(() =>{
                                    res.json({
                                        //the user should be taken to the homepage of the application
                                        message: ' User verified successfully'
                                    })
                                })
                                .catch((error) =>{
                                    res.json({
                                        message: 'Error occur while deleting the user model'
                                    })
                                })
                            })
                            .catch((error) => {
                                console.log(error);
                                res.json({
                                    message: 'Error Occured while updating the user record'
                                })
                            })
                        }else{
                            //user exist but incorrect parameters
                            res.json({
                                message: 'Incorrect parameters'
                            })
                        }
                    })
                    .catch((error) =>{
                        res.json({
                            message: 'error occurs while comparing the unique strings'
                        })
                    })
                }

            }else{
                //user verification model couldn't find such  userid
                //frontend can do some funny shits here
                console.log('User Verification Does not Exist');
                res.json({
                    message:'User Verification Does not Exist'
                })
            }
        })
        .catch((error) =>{
            console.log(error);
            //frontend guys can do a display page here to return a customized error message
            res.json({
                message: 'Error occur while handling verification link'
            })
        })
    }
    )






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
        UserQuiz.find({email}).then(data =>{
            if(data.length>0){
                //check if the user is verified
                if(!data[0].verified){
                    res.json({
                        message: 'Email has not been verified'
                    })
                }else{
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
                        message: 'Error occur while signing in/comparing password'
                    })
                })
                }
                

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
});


//password reset request route

router.post("/requestPasswordReset", (req, res) => {
    const {email, redirectUrl} = req.body;

    //first check if the user exist in the user record
    UserQuiz
    .find({email})
    .then((data) =>{
        if(data.length>0){
            //there is such user
            //check first if the user is verified
            if(!data[0].verified){
                res.json({
                    message: 'Check your inbox and verify your email address'
                })
            }else{
                //the user exist and is verified
                sendResetEmail(data[0], redirectUrl, res);
            }
        }else{
            res.json({
                message:'No such User exist'
            })
        }
    })
    .catch((error) =>{
        res.json({
            message: 'Error occurs while finding the user in the user record'
        })
    })
});

//send reset password link
const sendResetEmail = ({_id, email}, redirectUrl, res) =>{
    //forming the resetstring
    const resetString = uuidv4() + _id;
    //console.log(resetString);
    //delete the existing record of the password reset object from the db before sending another reset link
    PasswordReset
    .deleteMany({userId:_id})
    .then((result) =>{
        //we can now go ahead and send the reset password link
        const mailOptions = {
            from: {
                address: process.env.AUTH_EMAIL,
                name: 'Group 3 Lab One Project'
            },
            to: email,
            subject: 'Password reset',
            //add html property
            html: `<p>Oops! So Sorry you lost your password. Use the link below to reset it</p>
            <p>This link expires in <b> 60 minutes.</b></p>
            <p> Click here <a href="${redirectUrl + '/' + _id + '/' + resetString}">${redirectUrl + '/' + _id + '/' + resetString}</a> </p>`
        }

        //hash the resetString before saving it to the database
        const salt = 10;
        bcrypt
        .hash(resetString, salt)
        .then(hashedResetString =>{
            //console.log(hashedResetString);
            //save it in password reset model
            //first, create a new password reset string
            const newPasswordReset = new PasswordReset({
                userId : _id,
                resetString : hashedResetString,
                createdAt : Date.now(),
                expiresAt : Date.now() + 3600000
            });
            newPasswordReset
            .save()
            .then(()=>{
                //we are now ready to send the reset link
                transporter.sendMail(mailOptions)
                .then(()=>{
                    res.json({
                        message: 'Reset link sent successfully'
                    })
                })
                .catch((error)=>{
                    console.log(error);
                    res.json({
                        message: 'Error occur while sending reset link'
                    })
                })
            })
            .catch((error) =>{
                console.log(error);
                res.json({
                    message: 'Error occur while saving to the password reset model'
                })
            })
        })
        .catch((error) =>{
            console.log(error);
            res.json({
                message: 'Error occur while hashing the reset string'
            })
        })
    })
    .catch((error) =>{
        console.log(error);
        res.json({
            message: 'Error occured while deleting existing records'
        })
    })

}


//actual reset password url

router.post("/resetPassword", (req,res)=>{
    let {userId, resetString, newPassword} = req.body;

    //first check if the string the user is passing actually exists in our collection
    PasswordReset.find({userId})
    .then(result=>{
        if(result.length>0){
            //we found a user
            //check for the expiration of the link
            const {expiresAt} = result[0];
            const hashedResetString = result[0].resetString;

            if(expiresAt < Date.now()){
                //it has expired and we need to delete it
                PasswordReset
                .deleteOne({userId})
                .then(()=>{
                    res.json({
                        message:'Reset link has expired, try again'
                    })
                })
                .catch((error)=>{
                    console.log(error);
                    res.json({
                        message: 'Error occured while deleting the expired reset link'
                    })
                })
            }else{
                //link is still active
                //check if the string the user is passing is the same as that stored in the database

                bcrypt
                .compare(resetString, hashedResetString)
                .then((result)=>{
                    if(result){
                        //both matched
                        //go ahead and hash the new password and store it in a database
                        const salt = 10;
                        bcrypt
                        .hash(newPassword, salt)
                        .then((hashedNewPassword)=>{
                            UserQuiz
                            .updateOne({_id:userId}, {password : hashedNewPassword})
                            .then(()=>{
                                //update complete, dete the password reset model
                                PasswordReset
                                .deleteOne({userId})
                                .then(()=>{
                                    res.json({
                                        message:'Password updated successfully'
                                    })
                                })
                                .catch((error)=>{
                                    console.log(error);
                                    res.json({
                                        message:'Error occur while deleting password reset model'
                                    })
                                })
                            })
                            .catch((error) =>{
                                res.json({
                                    message: 'Error occur while updating password'
                                })
                            })
                        })
                        .catch((error) =>{
                            console.log(error);
                            res.json({
                                message:'Error occur while hashing new password'
                            })
                        })
                    }else{
                        res.json({
                            message:'ResetString and the hashed one are not the same'
                        })
                    }
                })
                .catch((error)=>{
                    console.log(error);
                    res.json({
                        message:'Error occured while comparing the reset string and the hashed one'
                    })
                })
            }
        }else{
            res.json({
                message:'User with such userId does not exist'
            })
        }
    })
    .catch((error) =>{
        console.log(error);
        res.json({
            message:'Error Occured while searching for the userid'
        })
    })
})



module.exports= router;