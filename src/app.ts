import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import { connectDatabase } from "./config/dbConfig";
import cors from "cors";
import userRouter from "./api/routes/userRoute";
import imageRouter from "./api/routes/imageRoute";
import cookieParser from "cookie-parser";
const app: Application = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://inspire-ai-frontend.vercel.app",
      "https://inspire-ai-frontend-phi.vercel.app",
      "https://app.theinspire.ai",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
connectDatabase();

app.get("/", (req: Request, res: Response) => {
  res.send({ home: "This is Home Page" });
});

app.use("/user", userRouter);
app.use("/image", imageRouter);

export default app;
