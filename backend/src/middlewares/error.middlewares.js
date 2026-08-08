import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";

// This is standard stuff no problem If I don't understand it now.

const errorHandler=(err,req,res,next)=>{
    let error=err
    
    if(!(error instanceof ApiError)){
        const statusCode=error.statusCode || (error instanceof mongoose.Error ? 400 : 500)
        const message=error.message || "Something went wrong!"

        error=new ApiError(statusCode,message,error?.errors || [],err.stack) 
        // error?.errors-> this one is for the scenario if there are errors inside error.


    }

    const response={
        ...error,
        message:error.message,
        ...(process.env.NODE_ENV==="development" ? {stack:error.stack} : {})
    }

    return res.status(error.statusCode).json(response);
}

export {errorHandler};