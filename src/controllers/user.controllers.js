import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { oldImageToBeDeleted, uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
    try {

        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        // validateBeforeSave parameter is added in save otherwise it will check user model all validation like required true fields of others(like password)
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh token and access token.")
    }
}  

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
    // console.log("req.body: ",req.body);

    // Read about this validation way, about some and overall how this code works
    if(
        [fullName, username, email, password].some( (field) => field?.trim()==="")
    ){
        throw new ApiError(400, "All field are required.");
    }

    const existedUser = await User.findOne({
        // $or , $and --> are mongodb operators
        $or: [{ username },{ email }]
    });

    if( existedUser ){
        throw new ApiError(409, "User with email or username already exists.")
    }


    // console.log("req.files: ",req.files);
    // This "files" is available because of "multer", like how req.body is given by express
    const avatarLocalPath = req.files?.avatar[0]?.path; // Local path isliye bola kyuki ye abhi server pe hai and cloudinary pe abhi nhi gya hai
    // console.log("Avatar Local Path: ",avatarLocalPath);

    // const coverImageLocalPath = req.files?.coverImage[0]?.path; // this is giving error when not giving coverImage
    // console.log("CoverImage Local Path: ",coverImageLocalPath);

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if( !avatarLocalPath ){
        throw new ApiError(400, "Avatar file is required.")
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    // console.log("avatar: ", avatar);
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


    if( !createdUser ){
        throw new ApiError(500,"Something went wrong while registring the user.");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully.")
    )

})

const loginUser = asyncHandler( async ( req, res ) =>{
    // req body -> data
    // username or email
    // find the user
    // password check
    // access token and refresh token
    // send cookie

    const {username, email, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email is required.")
    }
    if( !password ){
        throw new ApiError(400, "password is required.")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if( !user ){
        throw new ApiError(404,"User does not exists.");
    }

    // here, we will not use "User" because this comes from mongodb, and we cannot apply our functions like isPasswordCorrect, generateAccessToken

    const isPasswordValid = await user.isPasswordCorrect(password);

    if( !isPasswordValid ){
        throw new ApiError(401,"Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // optional step: this is the data that we will share with the user
    const loggedinUser = await User.findOne(user._id).select( " -password -refreshToken ");

    // cookies require options, the below option provided makes cookie only modifiable by the server and cannot be done from frontend
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie( "accessToken", accessToken, options )
    .cookie( "refreshToken", refreshToken, options )
    .json(
        new ApiResponse(
            200,
            {
                user: loggedinUser, 
                accessToken, 
                refreshToken

            },
            "User logged in Successfully."
        )
    )
})

const logoutUser = asyncHandler( async ( req,res ) =>{
    // cookies remove
    // accessToken, refreshToken remove
    // ye above task ker ne ke liye humare pass user ka hona zaruri hai jo abhi humare pass nhi hai

    // to solve above problem we created auth middleware and thats how we can access req.user

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully.")
    );

})

const refreshToken = asyncHandler( async ( req, res ) =>{

      const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if( !incomingRefreshToken ){
        throw new ApiError( 401, "Unauthorised request.");
      }

      try {
        const decodedToken = jwt.verify( incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
        const user = await User.findById(decodedToken?._id);
  
        if( !user ){
          throw new ApiError( 401, "Invalid refresh token.");
        }
  
        if( incomingRefreshToken !== user?.refreshToken ){
          throw new ApiError( 401, "Refresh token is expired or used.");
        }
  
        const options = {
          httpOnly: true,
          secure: true
        }
        
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
  
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
          new ApiResponse(
              200,
              {
                  accessToken,
                  refreshToken: newRefreshToken
              },
              "Access token refreshed."
  
           )
        )
      } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token.")
      }


})

const changeCurrentPassword = asyncHandler( async (req,res) =>{
    const {oldPassword, newPassword} = req.body;

    // req.user._id ---> comes from auth middleware that we will be requiring when we sent this in route
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

    if( !isPasswordCorrect ){
        throw new ApiError(400, "Your old password does not match.");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully.")
    )
})

const getCurrentUser = asyncHandler( async (req,res) =>{
    return res.status(200)
    .json(
        new ApiResponse(200, req.user, "Current user details fetched successfully.")
    )
})

const updateAccountDetails = asyncHandler (async(req,res)=>{
    //Advice: If ever wanted to update the image or any file related things, then create a different endpoint for it, otherwise it will update the whole db and not considered a professional way.

    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "Fullname and email are required.")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                // fullName: fullName // ase likho ya phir do like done below, whatever suits you
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Updated Account details successfully.")
    )
})

const updateUserAvatar = asyncHandler (async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if( !avatarLocalPath ){
        throw new ApiError(400, "Avatar file missing.")
    }

    const avatar = await uploadCloudinary(avatarLocalPath);

    if( !avatar.url ){
        throw new ApiError(400, "Error while uploading avatar.")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    );

    await oldImageToBeDeleted(avatar.public_id);

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Updated avatar successfully.")
    )
})

const updateUserCoverImage = asyncHandler (async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if( !coverImageLocalPath ){
        throw new ApiError(400, "Avatar file missing.")
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if( !coverImage.url ){
        throw new ApiError(400, "Error while uploading cover image.")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    )

    await oldImageToBeDeleted(coverImage.public_id);

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Updated cover image successfully.")
    )
})

const getUserChannelProfile = asyncHandler (async(req,res)=>{
    const {username} = req.params;

    if( !username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }

    ])

    console.log("channel aggregate pipline: ",channel);

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists");
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "User channeled fetched successfully.")
    );
})

const getWatchHistory = asyncHandler (async (req,res) =>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully.")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}