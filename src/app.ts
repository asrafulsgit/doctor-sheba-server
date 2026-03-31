import express, { Application, raw, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import router from "./app/routes";
import { envVars } from "./app/config"; 
import { stripeWebhook } from "./app/modules/payment/payment.services";

const app: Application = express();

app.post("/webhook", raw({ type: "application/json" }), stripeWebhook);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

//parser
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.send({
    Message: "Server is running..",
    environment: envVars.NODE_ENV,
    uptime: process.uptime().toFixed() + " sec",
  });
});

app.use(globalErrorHandler);

app.use(notFound);

export default app;
