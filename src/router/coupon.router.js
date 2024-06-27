import { Router } from "express";
import couponModel from "../model/coupon.model";

const router = Router();

router.get("/", async (req, res) => {
  const { name, status } = req.query;
  const filterParams = {};
  if (name) {
    filterParams.$or = [
      { name: { $regex: name, $options: 'i' } },
      { type: { $regex: name, $options: 'i' } }
    ];
  }
  if (status) filterParams.status = status;
  res.send(await couponModel.find(filterParams));
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const coupon = await couponModel.findById(id);
  res.json({ status: 200, coupon });
});

router.post("/", async (req, res) => {
  const coupon = req.body;
  coupon.status = 'inactive';
  await couponModel.create(coupon);
  res.send({ status: 200 });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const coupon = req.body;
  await couponModel.findByIdAndUpdate(id, coupon);
  res.send({ status: 200 });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await couponModel.findByIdAndDelete(id);
  res.send({ status: 200 });
});

export default router;
