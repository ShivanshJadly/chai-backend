import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env"
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`App listening on port ${process.env.PORT}.`)
    })
})
.catch((err)=>{
    console.log("Mongo db connection failed !!!",err);
})












// Approch 1 of connecting MongoDB 
/*
const app = express();

( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(err)=>{
            console.log("ERROR: ",err);
            throw err;
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App listening on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.log("ERROR: ",error);
        throw error;
    }
})()

*/
