class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went wrong!",
        errors=[],
        stack=""
    ){
        super(message),
        this.statusCode=statusCode,
        this.data=null,
        this.message=message,
        this.success=false,
        this.errors=errors

        if(stack){
            this.stack=stack // If a stack trace is provided then it will be passed in this.stack
        }
        else{
            Error.captureStackTrace(this,this.constructor) // A stack trace will be created.
        }
    }
}

export {ApiError}