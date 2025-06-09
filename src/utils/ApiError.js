class ApiError extends Error{
    constructor(
        statusCode,
        message= "Something went wrong!",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null // Read about this.data
        this.message = message
        this.status = false
        this.errors = errors

        if(stack){
             this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}