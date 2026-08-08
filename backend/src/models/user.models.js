/* 
  id string pk
  username string
  email string
  fullname string
  avatar string
  coverimage string
  password string
  refreshToken string
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true

        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // Cloudinary URL
            required: true
        },

        coverImage: {
            type: String, // Cloudinary URL

        },

        watchHistory: [// square brackets bcoz watchHistory is an array // Inside we will have different videos in form of objects

            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }

        ],

        password: {
            type: String,
            required: [true, "Password is required!"]// Here we are trying to control the error when password field is left empty.
        },

        refreshToken: {
            type: String
        }
    },
    { timestamps: true } // These are for "createdAt" and "updatedAt".

)

// We write the methods related to models in the model files not the controllers files

// bcrypt is used to hash the password before it is saved in the databse so it is a pre-hook
// pre-hook is also a middle ware so it also requires a 'next'
// 'next' helps us to go from one middleware to another or to the next step.

userSchema.pre("save", async function () { // !! Never write next here ,never or you will cry blood tears.
    if (!this.isModified("password")) return; // If the modified field is not password then we can directly move on. Registering and first time saving the password is considered modifying the field so hashing will happen.
    this.password = await bcrypt.hash(this.password, 10);


})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
    // this.password refers to the password stored in the database (hashed), not the password the user just typed.
    // remember to review this when writing the code for login in controllers
}

// JWT Tokens:- Access and Refresh Tokens

userSchema.methods.generateAccessToken = function () {
    // A very short lived token.
    return jwt.sign({// this is thepayload
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    }, process.env.ACCESS_TOKEN_SECRET,// This is the secret
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
    // Header-Not specified → defaults to HS256 + JWT
}

userSchema.methods.generateRefreshToken = function () {
    // A very short lived token.
    return jwt.sign({// this is thepayload
        _id: this._id,

    }, process.env.REFRESH_TOKEN_SECRET,// This is the secret
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    // Header-Not specified → defaults to HS256 + JWT
}


export const User = mongoose.model("User", userSchema);
// User will become users in mongoDB