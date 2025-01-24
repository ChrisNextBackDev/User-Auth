const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerificationSchema = new Schema({
    userId: String, //the automatically generated id from our user record
    uniqueString: String, //random generated string for user who is about to be verified
    //password: String,
    createdAt: Date,
    expiresAt: Date
});

const UserVerification = mongoose.model('UserVerification', UserVerificationSchema);
module.exports = UserVerification;