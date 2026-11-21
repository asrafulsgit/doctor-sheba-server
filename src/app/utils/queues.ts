import { Queue } from "bullmq";
import { bullmqConnectionOptions } from "../config/redis";

export const meetingQueue = new Queue("appointment-meetings", {
  connection: bullmqConnectionOptions,
});