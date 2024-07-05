import { Router } from "express";
import producttagModel from "../model/producttag.model";

const router = Router();

router.get("/", async (req, res) => {
  const { name, status } = req.query;
  const filter = {};
  if (name) filter.name = new RegExp(name, "g");
  if (status) filter.status = status;
  res.send(await producttagModel.find(filter));
});

router.get("/:id", async (req, res) => {
  res.send(await producttagModel.findById(req.params.id));
});

router.post("/", async (req, res) => {
  res.send({
    message: "created",
    data: await producttagModel.create(req.body),
  });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const tag = req.body;
  await producttagModel.findByIdAndUpdate(id, tag);
  res.send({ status: 200 });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await producttagModel.findByIdAndDelete(id);
  return res.send({ status: 200 });
});

export default router;
