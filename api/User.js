const express = require('express');

const router= express.Router();

//mongo db user model
const User = require('../models/User')

//password handler
const bcrypt = require('bcrypt');

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
                    dateOfBirth
                });
                newUser.save().then(result =>{
                    res.status(200);
                    res.json({
                        message: 'user created succesfully',
                        data : result,
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
            })
        }
        }).catch(err =>{
            console.log(err);
            res.json({
                message: 'an error occur while checking existing user'
            })
        })
    }
});



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