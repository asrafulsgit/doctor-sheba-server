import jwt from "jsonwebtoken";

export const decodedToken = (token: string, secret: string) => {
  const verifiedToken = jwt.verify(token, secret);
  return verifiedToken;
};
