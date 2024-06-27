import { Router } from "express";

import featuredModel from "../model/featured.model";
import upload from "../multer";

const router = Router();

router.post("/", upload.single("image"), async (req, res) => {
  try {
    res.send(
      await featuredModel.create({
        ...req.body,
        tags: JSON.parse(req.body.tags),
        image: req.file.path,
      })
    );
  } catch (err) {
    res.send(JSON.stringify(err));
  }
});
router.get("/", async (req, res) => {
  res.send(await featuredModel.find({}));
});
export default router;
