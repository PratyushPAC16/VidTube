import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => { // This function connects youe node.js app to mongoDB and stops the app if connection falls
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected! DB host: ${connectionInstance.connection.host}`);

    } catch (error) {
        console.log("MongoDB connection error", error);
        process.exit(1);

    }
}

export default connectDB