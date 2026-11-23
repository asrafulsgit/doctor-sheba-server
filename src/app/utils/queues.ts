import { Queue } from "bullmq";
import { bullmqConnectionOptions } from "../config/redis";

export const meetingQueue = new Queue("appointment-meetings", {
  connection: bullmqConnectionOptions,
});
export interface RefundJobData {
  refundId: string;
}

export const refundQueue = new Queue<RefundJobData>(
  "appointment-refunds",
  {
    connection: bullmqConnectionOptions,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: false,
    },
  },
);

export const enqueueRefund = async (refundId: string) => {
  return refundQueue.add(
    "process-refund",
    { refundId },
    {
      jobId: `refund-${refundId}`,
    },
  );
};
