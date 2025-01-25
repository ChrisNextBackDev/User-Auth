const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PasswordResetSchema = new Schema({
    userId: String, //the automatically generated id from our user record
    resetString: String, //random generated string for user who is about to be verified
    //password: String,
    createdAt: Date,
    expiresAt: Date
});

const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);
module.exports = PasswordReset;