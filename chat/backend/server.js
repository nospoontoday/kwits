import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.route.js";
dotenv.config();

const app = express();

//middleware
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_PORT = process.env.MONGODB_PORT || 5001;

//database connection
const dbURI = 'mongodb+srv://oliverjohnpr2013:nh4JU0ANQQiFFsMY@kwits-chat.jbmlfyf.mongodb.net/kwits-chat';
mongoose.connect(dbURI, { useUnifiedTopology: true })
    .then((result) => app.listen(MONGODB_PORT))
    .catch((err) => console.log(err));

app.get("/", (req, res) => {
    res.send("Hello Worlds!");
});

app.use("/api/chat", chatRoutes);

app.listen(PORT, () => console.log(`server running on port ${PORT}`));