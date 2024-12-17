const express=require('express');
const app=express();
const cors=require('cors');
const dbConnection=require('./dbconnection');
const router = require('./router');


app.use(cors());
app.use(express.json()); // to parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // to parse URL-encoded data
dbConnection();
app.use('/seat',router)
app.listen(process.env.PORT,()=>console.log(`Server listening on ${process.env.PORT} port`))


