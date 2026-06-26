import express from "express";

import s3 from "./config/s3.js";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import docRoutes from "./routes/docRoutes.js;"

app.use(cors({
  origin: [
    'http://localhost:3000',     
    'http://localhost:5500',     
    'http://YOUR_EC2_PUBLIC_IP',//laster maybe
    'https://yourdomain.com',  //later maybe 
  ],
  credentials: true,
}));

const app = express();

app.use(express.json());
app.use("/api/auth/", authRoutes);
app.use("/api/docs/", docRoutes);

app.use(errorHandler);
 
export default app;
