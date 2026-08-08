import dotenv from "dotenv";
import connectDB from "./db/index.js";

// LOAD ENV FIRST
dotenv.config({ path: "./.env" });

console.log("PORT after dotenv:", process.env.PORT); // must print 8000

import { app } from "./app.js";

const PORT = process.env.PORT;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    })
    .catch((err) => {
        console.log("MongoDB connection error!", err);
    })
