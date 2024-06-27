import jwt from "jsonwebtoken";

import communityModel from "../model/community.model";
import { SECRET_KEY } from "../config";

export default async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.json({ status: 401 });
  }

  const token = authorization.slice("Bearer ".length);
  try {
    const tokenUser = await jwt.verify(token, SECRET_KEY);
    if (!tokenUser.id || tokenUser.role !== "community-organizer") {
      return res.json({ status: 401 });
    }
    const currentUser = await communityModel.findById(tokenUser.id);
    if (!currentUser) {
      return res.json({ status: 401 });
    }
    req.community = currentUser;
    next();
  } catch (err) {
    console.log(err);
    return res.json({ status: 401 });
  }
};
