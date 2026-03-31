import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client"; 
import { reviewControllers } from "./review.controllers";

const router = Router();

// router.get(
//   "/",
//   authentication(UserRole.ADMIN),
//   prescriptionControllers.getPrescriptionsController
// );
// router.get(
//   "/my-prescriptions",
//   authentication(UserRole.DOCTOR,UserRole.PATIENT),
//   prescriptionControllers.myPrescriptionsController
// ); 

router.post(
  "/",
  authentication(UserRole.PATIENT),
  reviewControllers.createReviewController,
);

export const reviewRouter = router;
