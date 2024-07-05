import { Router } from "express";

import homepageModel from "../model/homepage.model";
import upload from "../multer";

const router = Router();

router.post("/", async (req, res) => {
  try {
    let data = await homepageModel.findOne({});
    if (data) {
      res.send({
        message: "updated",
        data: await homepageModel.findOneAndUpdate(req.body),
      });
    } else
      res.send({
        message: "created",
        data: await homepageModel.create(req.body),
      });
  } catch (error) {
    res.send({ message: "Error", data: error.message });
  }
});

router.post("/images", upload.array("images"), async (req, res) => {
  if (req.query.name == "slider_images") {
    let body = { slider_images: [] };
    for (let file of req.files) {
      body.slider_images.push(file.path);
    }
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else if (req.query.name == "vendor_slider_images") {
    let body = { vendor_slider_images: [] };
    for (let file of req.files) {
      body.vendor_slider_images.push(file.path);
    }
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else if (req.query.name == "ready_to_shop_images") {
    let body = { ready_to_shop_images: [] };
    for (let file of req.files) {
      body.ready_to_shop_images.push(file.path);
    }
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else if (req.query.name == "how_it_works_image") {
    let body = { how_it_works_image: req.files[0].path };
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else if (req.query.name == "how_it_works_hero_image") {
    let body = { how_it_works_hero_image: req.files[0].path };
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else if (req.query.name == "how_it_works_side_image") {
    let body = { how_it_works_side_image: req.files[0].path };
    res.send({
      message: "updated",
      data: await homepageModel.findOneAndUpdate(body),
    });
  } else res.send({ message: "unknown request" });
});

export default router;
