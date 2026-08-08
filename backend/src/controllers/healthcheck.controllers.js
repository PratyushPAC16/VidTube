import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => { // Here asyn is needed only for situations where database query type of things happen, its just future proofing that the asyncHandler always returns a Promise (Which it already does.)
    return res
        .status(200)
        .json(new ApiResponse(200, "OK", "Healthcheck Passed!"))
})

export { healthcheck }