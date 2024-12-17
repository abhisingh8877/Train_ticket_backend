const mongoose = require("mongoose");

const schema=new mongoose.Schema({
    Number_seat: { type: Number, default: 80 },
    SeatArrangeMent: { type: [[Number]], default: [] } 
});
const userschema=new mongoose.Schema({
    name:String,
    seatNumber:{ type: [[Number]], default: [] } 
});
const userModel=mongoose.model('User',userschema);
const SeatModel= mongoose.model('Seating',schema);

module.exports={SeatModel,userModel};