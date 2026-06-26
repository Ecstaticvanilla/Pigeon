import express from "express";
import {connectDB} from "./config/db.js"
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT;

connectDB().then(() =>{
    app.listen(PORT, () => {
        console.log(`Server running on Port ${PORT}`);
    });
});