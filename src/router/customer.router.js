import { Router } from "express";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";

import customerModel from "../model/customer.model";
import customerMiddleware from '../middleware/customer.middleware';
import { SECRET_KEY } from "../config";

const router = Router();

router.get("/", async (req, res) => {
  const { name, status, sort, from, to } = req.query;

  let filterParams = {}, sortParams = {};
  if (name) {
    filterParams.$or = [
      { fullName: { $regex: name, $options: 'i' } },
      { email: { $regex: name, $options: 'i' } },
      { phone: { $regex: name, $options: 'i' } }
    ]
  }
  if (status) filterParams.status = status;
  filterParams.signup_at = {};
  if (from) filterParams.signup_at.$gte = from;
  if (to) filterParams.signup_at.$lte = to;
  if (JSON.stringify(filterParams.signup_at) == "{}") delete filterParams.signup_at;

  if (sort) {
    if (sort === 'alphabeta') sortParams.firstName = -1;
    else if (sort === 'recent') sortParams.signup_at = 1;
  }

  try {
    const customers = await customerModel.find(filterParams).sort(sortParams)
    res.send(customers);
  } catch (err) {
    console.log(err);
  }
});

router.get("/admin", async (req, res) => {
  const { name, status, sort, from, to } = req.query;

  let filterParams = {}, sortParams = {};
  if (name) {
    filterParams.$or = [
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ["$firstName", " ", "$lastName"] },
            regex: name,
            options: "i"
          }
        }
      },
      { email: { $regex: name, $options: 'i' } },
      { phone: { $regex: name, $options: 'i' } }
    ]
  }
  if (status) filterParams.status = status;
  filterParams.signup_at = {};
  if (from) filterParams.signup_at.$gte = from;
  if (to) filterParams.signup_at.$lte = to;
  if (JSON.stringify(filterParams.signup_at) == "{}") delete filterParams.signup_at;

  if (sort) {
    if (sort === 'alphabeta') sortParams.firstName = 1;
    else if (sort === 'recent') sortParams.signup_at = -1;
  }

  try {
    const customers = await customerModel.find(filterParams).sort(sortParams)
    res.send(customers);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internel error!');
  }
});

router.get('/address', customerMiddleware, async (req, res) => {
  const customer = req.customer;
  res.send(customer.addressBook);
});

router.get("/:id", async (req, res) => {
  res.send(await customerModel.findById(req.params.id));
});
// signin
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice("Bearer ".length);
    try {
      const tokenUser = await jwt.verify(token, SECRET_KEY);
      if (!tokenUser.id || tokenUser.role !== "customer") {
        return res.json({ status: 401 });
      }
      const currentUser = await customerModel
        .findById(tokenUser.id)
        .select("firstName lastName zipcode email phone");
      if (!currentUser) {
        return res.json({ status: 401 });
      }
      return res.json({ status: 200, profile: currentUser });
    } catch (err) {
      return res.json({ status: 401 });
    }
  }

  try {
    const user = await customerModel
      .findOne({
        $or: [
          { email },
          { phone: email }
        ]
      })
      .select("firstName lastName zipcode email phone password");
    if (!user) {
      return res.json({ status: 404 });
    }
    const isEqual = await compare(password, user.password);
    if (!isEqual) {
      return res.json({ status: 400 });
    }
    const token = await jwt.sign(
      {
        id: user._id,
        role: "customer",
      },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    delete user.password;
    return res.json({ status: 200, token, profile: user });
  } catch (error) {
    console.log(error);
    return res.json({ status: 500 });
  }
});

router.post("/register", async (req, res) => {
  const customer = req.body;
  try {
    customer.password = await hash(customer.password, 10);
    customer.signup_at = new Date();
    const profile = await customerModel.create(customer);
    const token = await jwt.sign(
      {
        id: profile._id,
        role: "customer",
      },
      SECRET_KEY,
      { expiresIn: "7d" }
    );
    return res.send({ status: 200, token, profile });
  } catch (error) {
    res.send({ message: "Error", data: error.message });
  }
});

router.put('/address', customerMiddleware, async (req, res) => {
  const customer = req.customer;
  const { addressBook } = req.body;
  try {
    if (addressBook) customer.addressBook = addressBook;
    await customer.save();
    res.send({ status: 200 });
  } catch (err) {
    console.log(err);
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const customer = req.body;
  try {
    await customerModel.findByIdAndUpdate(id, customer);
    res.send({ status: 200 });
  } catch (err) {
    console.log(err);
    res.send({ status: 500 });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await customerModel.findByIdAndDelete(id);
    res.send({ status: 200 });
  } catch (err) {
    console.log(err);
    res.send({ status: 500 });
  }
})

export default router;
