import { Router } from "express";

import supportModel from "../model/support.model";
import upload from "../multer";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { latest, filter } = req.query;
    if (latest) {
      const recentPosts = await supportModel
        .find({
          $or: [
            { title: new RegExp(filter, "i") },
            { topic: new RegExp(filter, "i") },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(3);
      const today = new Date(),
        firstDay = new Date(),
        lastDay = new Date();
      const weekday = today.getDay();
      firstDay.setDate(today.getDate() - weekday);
      lastDay.setDate(firstDay.getDate() - 7);
      const lastWeekPosts = await supportModel.find({
        createdAt: {
          $gte: firstDay,
          $lt: lastDay,
        },
      });
      return res.json({ recent: recentPosts, last: lastWeekPosts });
    } else {
      return res.send(await supportModel.find());
    }
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});
router.get("/:id", async (req, res) => {
  res.send(await supportModel.findById(req.params.id));
});

router.post("/", upload.array("image"), async (req, res) => {
  res.send({
    message: "created",
    data: await supportModel.create({
      ...req.body,
      thumbnail_image: req.files[0].path || "",
      large_image: req.files[1].path || "",
    }),
    status: "inactive",
    createdAt: new Date(),
  });
});

router.put("/image", upload.single("img"), async (req, res) => {
  let body = {};
  body[req.query.field] = req.file.path;
  res.send({
    mesage: "updated",
    data: await supportModel.findByIdAndUpdate(req.query.id, body, {
      new: true,
    }),
  });
});

router.put("/", async (req, res) => {
  res.send({
    message: "updated",
    data: await supportModel.findByIdAndUpdate(req.query.id, req.body),
  });
});

router.delete("/", async (req, res) => {
  res.send({
    message: "deleted",
    data: await supportModel.findByIdAndDelete(req.query.id),
  });
});

export default router;
