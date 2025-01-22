require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL)
.then(()=>{
    console.log('Db connected');
})
.catch((err)=> console.log(err));