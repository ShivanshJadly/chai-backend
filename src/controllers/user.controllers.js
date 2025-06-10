import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler ( async (req, res) =>{
    // get user details from frontend
    // validate - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response


    // Note: This is "destructure syntax" from js
    const {fullName, username, email, password} = req.body;

    // Read about this validation way, about some and overall how this code works
    if(
        [fullName, username, email, password].some( (field) => field?.trim()==="")
    ){
        throw new ApiError(400, "All field are required.");
    }

    const existedUser = User.findOne({
        // $ makes us use all the operators functionality in this
        $or: [{ username },{ email }]
    });

    if( existedUser ){
        throw new ApiError(409, "User with email or username already exists.")
    }

    // This files is available because of "multer", like how req.body is given by express
    const avatarLocalPath = req.files?.avatar[0]?.path; // Local path isliye bola kyuki ye abhi server pe hai and cloudinary pe abhi nhi gya hai
    console.log("Avatar Local Path: ",avatarLocalPath);

    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    console.log("CoverImage Local Path: ",coverImageLocalPath);

    if( !avatarLocalPath ){
        throw new ApiError(400, "Avatar file is required.")
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if( !avatar ){
        throw new ApiError(400, "Avatar file is required.")
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // ye isliye kyu ki pure code me humne kabhi validate hi nhi kiya coverImage ko like we did with avatar image, so error na aaye hum ye check ker rhe hai
        username: username.toLowerCase(),
        password,
        email
    })

    const createdUser = await User.findById(user._id).select(
        // " - " matlab wo field nhi chaiye. It takes string thats why it has this syntax
        "-password -refreshToken"
    );

    if(createdUser){
        throw new ApiError(500,"Something went wrong while registring the user.");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully.")
    )

})

export {registerUser}