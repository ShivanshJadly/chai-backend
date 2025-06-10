import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"; // interview questions comes from this, Read the docs of jwt
import bcrypt from "bcrypt" // Read about bcrypt 

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
        index: true // kisi bhi field me searching enable kerni hai to we do index: true, iske bina bhi ho sakta hai but this is optimised way, also keep in mind that this is an expensive method
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, // cloudinary url
        required: true
    },
     coverImage: {
        type: String
    },
     password: {
        type: String,
        required: [true, "Password is required!"]
    },
     refreshToken: {
        type: String
    },
     watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
     ]
},{timestamps: true})


// Dont use arrow function in this callback because we know in js arrow fuction does not have "this" keyword context
userSchema.pre("save", async function (next){
    // ye if condition is necessary otherwise it will change password everytime we save any data in db
    // this.isModified() is built in method 
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)
    next()
})

// This is how we can make our own methods
userSchema.methods.isPasswordCorrect =  async function (password) {

    return await bcrypt.compare(password, this.password)
};

// Access token and Refresh token have no significant difference, but how we use them thats what make them different
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

export const User = mongoose.model("User",userSchema);