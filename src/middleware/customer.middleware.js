import jwt from "jsonwebtoken";

import customerModel from "../model/customer.model";
import { SECRET_KEY } from "../config";

const customerMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.json({ status: 401 });
  }

  const token = authorization.slice("Bearer ".length);
  try {
    const tokenUser = await jwt.verify(token, SECRET_KEY);
    if (!tokenUser.id || tokenUser.role !== "customer") {
      return res.json({ status: 401 });
    }
    const currentUser = await customerModel.findById(tokenUser.id);
    if (!currentUser) {
      return res.json({ status: 401 });
    }
    req.customer = currentUser;
    next();
  } catch (err) {
    console.log(err);
    return res.json({ status: 401 });
  }
};

export default customerMiddleware;