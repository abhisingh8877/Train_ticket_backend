const express=require('express');
const router=express.Router();
const {SeatModel,userModel}=require('./db_schema');
router.use(express.json());
router.get('/',(req,res)=>{
    console.log('we are good to Go');
    res.send('Hi we are at basic route');
})

function generateRandomSeatArrangement(rows, cols) {
    let arrangement = [];
    for (let i = 0; i < rows; i++) {
        let row = [];
        for (let j = 0; j < cols; j++) {
            row.push(0); // Random value (0 or 1 for seat availability)
        }
        row.push(11);
        arrangement.push(row);
    }
    let last_row=[0,0,0,3];

    arrangement.push(last_row);

    return arrangement;
}
router.post('/create_seat',async(req,res)=>{
    try{
        await SeatModel.deleteMany({});
        const seating=generateRandomSeatArrangement(7,11);
        
         await SeatModel.create({ Number_seat: 80, SeatArrangeMent: seating });
        res.json({message:"Seats are inserted sucessfully inserted",seating});
    }
    catch(error)
    {
        res.json({message:"Their is some error"});
    } 
})
router.get('/seat_availablity',async(req,res)=>{
    try
    {
        const seat_arrangeMent= await SeatModel.find({},{ SeatArrangeMent:1,_id:0});
        res.json({Message:"Your Seating arrangeMent is Like ",seat_arrangeMent});
    }
    catch(error)
    {
        res.json({Message:"Their is some error with server"});
    }
})
router.get('/user_seat/:userName', async (req, res) => {
    const name = req.params.userName; // Corrected from req.query to req.params
    try {
        const seat_occupied = await userModel.findOne({ name: name }, { seatNumber: 1 ,_id:0}); // Use findOne to get a single user
        
        if (!seat_occupied) { // Checking for null/undefined properly
            res.json({ message: "No seat found", seat_occupied: null });
        } else {
            res.json({ message: "This is your Seat arrangement", seat_occupied });
        }
    } catch (error) {
        res.status(500).json({ message: "There was an error", error });
    }
});

router.post('/reverveSeat', async (req, res) => {
    const { name, Number_seat } = req.body;
    const req_Number_seat=Number_seat;
    // Check seat limit per request
    if (req_Number_seat > 7) {
        return res.json({ message: "You can allocate at most 7 seats at a time.",isFailed:true });
    }

    // Validate that req_Number_seat is a number
    if (isNaN(req_Number_seat) || req_Number_seat <= 0) {
        return res.status(400).json({ message: "Invalid number of seats requested." ,isFailed:true});
    }

    try {
        // Find seat arrangement and total seat count
        const seatData = await SeatModel.findOne({}, { SeatArrangeMent: 1, Number_seat: 1 });
        
        if (!seatData || !seatData.SeatArrangeMent || isNaN(seatData.Number_seat)) {
            return res.status(400).json({ message: "Seat data is invalid or unavailable." ,isFailed:true});
        }

        const SeatArrangeMent = seatData.SeatArrangeMent;
        const totalSeat = seatData.Number_seat;

        // Ensure seat arrangement is valid
        if (!Array.isArray(SeatArrangeMent) || SeatArrangeMent.length < 8) {
            return res.status(400).json({ message: "Invalid seat arrangement structure." ,isFailed:true});
        }

        // Ensure user seat number is valid
        let final_seat = await userModel.findOne({ name: name });
        final_seat = final_seat?.seatNumber || generateRandomSeatArrangement(7, 11);

        // Check if enough seats are available
        if (totalSeat < req_Number_seat) {
            return res.json({ message: "Sorry, seats are not available." ,isFailed:true});
        }

        // Calculate new total seats after allocation
        let new_totalSeat_after_update = totalSeat - req_Number_seat;

        // Ensure the new total is valid
        if (isNaN(new_totalSeat_after_update) || new_totalSeat_after_update < 0) {
            return res.status(400).json({ message: "Failed to calculate remaining seats." ,isFailed:true});
        }

        let value_row = -1;

        // Find the row with available seats
        for (let i = 0; i < 7; i++) {
            let seat_per_row = SeatArrangeMent[i];
            if (seat_per_row[11] >= req_Number_seat) {
                value_row = i;
                break;
            }
        }

        // If no row with sufficient seats was found
        if (value_row == -1) {
            if (SeatArrangeMent[7][3] >= req_Number_seat) {
                for (let i = 0; i < 3; i++) {
                    if (SeatArrangeMent[7][i] == 0) {
                        SeatArrangeMent[7][i] = 1;
                        final_seat[7][i] = 1;
                    }
                }
                SeatArrangeMent[7][3] -= req_Number_seat;
            } else {
                let count_seat = 0;
                for (let i = 0; i < 7; i++) {
                    for (let j = 0; j < 11; j++) {
                        if (count_seat < req_Number_seat && SeatArrangeMent[i][j] == 0) {
                            SeatArrangeMent[i][j] = 1;
                            count_seat++;
                            final_seat[i][j] = 1;
                        }
                    }
                    if (count_seat >= req_Number_seat) {
                        break;
                    }
                }

                if (count_seat < req_Number_seat) {
                    let val = 0;
                    for (let i = 0; i < 3; i++) {
                        if (count_seat < req_Number_seat && SeatArrangeMent[7][i] == 0) {
                            final_seat[7][i] = 1;
                            SeatArrangeMent[7][i] = 1;
                            count_seat++;
                            val++;
                        }
                    }
                    SeatArrangeMent[7][3] -= val;
                }
            }
        } else {
            // Allocate seats in the identified row
            let value_seat_allocate=0;
            for (let i = 0; i < 11 && value_seat_allocate<req_Number_seat; i++) {
                if (SeatArrangeMent[value_row][i] == 0) {
                    final_seat[value_row][i] = 1;
                    SeatArrangeMent[value_row][i] = 1;
                    value_seat_allocate++;
                }
            }
            final_seat[value_row][11] = 0;
            SeatArrangeMent[value_row][11] -= req_Number_seat;
        }

        // Check if the user has booked seats before
        const user = await userModel.findOne({ name: name });
        if (!user) {
            // Create a new user with reserved seats
            await userModel.create({ name: name, seatNumber: final_seat });
        } else {
            // Add new reserved seats to the user's existing seats
            await userModel.updateOne({ name: name }, { 
                $set: { seatNumber: final_seat },
                $inc: { Number_seat: -req_Number_seat }
            });
        }

        // Update the seat arrangement in the database
        await SeatModel.updateOne({}, { 
            $set: { SeatArrangeMent: SeatArrangeMent, Number_seat: new_totalSeat_after_update } 
        });

        res.json({ message: "Seat is reserved successfully", final_seat,isFailed:false });

    } catch (error) {
        console.error("Error during seat reservation:", error);
        res.status(500).json({ message: "There is some error", error ,isFailed:true});
    }
});

module.exports=router;