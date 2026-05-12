import admin from "firebase-admin";
import { envVars } from ".";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
  }),
});

export const firebaseAdmin = admin;
