import { envVars } from "../config";
import { generateToken } from "./generateToken"; 

export const getTokens = (tokenPayload: {id : string, email : string,role : string}) => {
  const accessToken = generateToken(
    tokenPayload,
    envVars.JWT_ACCESS_TOKEN_SECRET,
    envVars.JWT_ACCESS_TOKEN_EXPIRESIN,
  );
  const refreshToken = generateToken(
    tokenPayload,
    envVars.JWT_REFRESH_TOKEN_SECRET,
    envVars.JWT_REFRESH_TOKEN_EXPIRESIN,
  );

  return {
    accessToken,
    refreshToken,
  };
};