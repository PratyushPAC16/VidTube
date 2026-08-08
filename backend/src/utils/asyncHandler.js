const asyncHandler=(requestHandler)=>{
    return(req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err));// Here the next is for handeling middleware situations.
    }
}

export {asyncHandler}

/* Purpose of Promise.resolve:

Handles both sync & async route handlers

Catches errors automatically

Prevents server crashes */

/* Promise.resolve() says:
“Whatever this is, treat it as a resolved promise.” */