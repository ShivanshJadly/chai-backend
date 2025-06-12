const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=> next(err));
    }
}

// If you call next() with no arguments, Express will move to the next middleware in the chain.

// If you call next(err) with an error, Express will skip all remaining non-error-handling middleware and go straight to the error-handling middleware

// Higher order function ----> JS topic
// const asyncHandler = (fn) => async(req,res,next) =>{
//     try {
//         await fn(req,res,next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
        
//     }
// }

export {asyncHandler}