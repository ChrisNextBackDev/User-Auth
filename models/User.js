const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserQuizSchema = new Schema({
    name: String,
    email: String,
    password: String,
    dateOfBirth: String,
    verified: Boolean   //to check if our user is verified and it is false by default
});

const UserQuiz = mongoose.model('UserQuiz', UserQuizSchema);
module.exports = UserQuiz;