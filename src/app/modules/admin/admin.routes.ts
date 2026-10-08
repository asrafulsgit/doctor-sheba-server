import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { authentication } from "../../middlewares/authentication";
import { UserRole } from "@prisma/client"; 
import { adminControllers } from "./admin.controllers";
import { adminValidators } from "./admin.validation";

const router = Router();

router.get(
  "/",
  authentication(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminControllers.getAdminsController,
);

router.patch(
  "/:userId",
  validateRequest(adminValidators.updateAdminValidationSchema),
  authentication(UserRole.SUPER_ADMIN),
  adminControllers.updateAdminController,
);

router.delete(
  "/:adminId",
  validateRequest(adminValidators.deleteAdminValidation),
  authentication(UserRole.SUPER_ADMIN),
  adminControllers.deleteAdminController,
);

export const adminRouter = router;
