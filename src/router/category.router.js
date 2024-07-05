import { Router } from "express";
import categoryModel from "../model/category.model";

const router = Router();

router.get("/", async (req, res) => {
  const { filter } = req.query;
  res.send(
    await categoryModel.find({
      name: new RegExp(filter || "", "i"),
    })
  );
});
router.get("/:id", async (req, res) => {
  res.send(await categoryModel.findById(req.params.id));
});

router.post("/", async (req, res) => {
  res.send({ message: "created", data: await categoryModel.create(req.body) });
});

router.put("/", async (req, res) => {
  res.send({
    message: "updated",
    data: await categoryModel.findByIdAndUpdate(req.query, id, req.body),
  });
});

router.delete("/", async (req, res) => {
  res.send({
    message: "deleted",
    data: await categoryModel.findByIdAndDelete(req.query.id),
  });
});
export default router;
