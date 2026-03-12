import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

export const generateToken = (
  payload: JwtPayload,
  secret: Secret,
  expiresIn: string,
) => {
  const token = jwt.sign(payload, secret, { expiresIn } as SignOptions);
  return token;
};
