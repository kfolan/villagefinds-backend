import jwt from "jsonwebtoken";

import vendorModel from "../model/vendor.model";

import { SECRET_KEY } from "../config";

export default async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.json({ status: 401 });
  }

  const token = authorization.slice("Bearer ".length);
  try {
    const tokenUser = await jwt.verify(token, SECRET_KEY);
    if (!tokenUser.id || tokenUser.role !== "vendor") {
      return res.json({ status: 401 });
    }
    const currentUser = await vendorModel.findById(tokenUser.id);
    if (!currentUser) {
      return res.json({ status: 401 });
    }
    req.vendor = currentUser;
    next();
  } catch (err) {
    console.log(err);
    return res.json({ status: 401 });
  }
};
