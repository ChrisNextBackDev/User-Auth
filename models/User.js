const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    email: String,
    password: String,
    dateOfBirth: String,
    verified: Boolean   //to check if our user is verified and it is false by default
});

const User = mongoose.model('User', UserSchema);
module.exports = User;