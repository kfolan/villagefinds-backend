import express from "express";

import inventoryModel from "../model/inventory.model";

import vendorMiddleware from "../middleware/vendor.middleware";
import uploadMiddleware from "../multer";

const router = express.Router();

router.get("/style/:styleId", async (req, res) => {
  const { styleId } = req.params;

  const inventories = await inventoryModel.find({
    styleId,
  });
  return res.json({ status: 200, inventories });
});

router.put(
  "/image",
  vendorMiddleware,
  uploadMiddleware.array("images"),
  async (req, res) => {
    const { styleId } = req.query;
    const { inventIDs: ids } = req.body;
    const inventIDs = JSON.parse(ids);

    try {
      const invents = await inventoryModel.find({ styleId });
      await Promise.all(
        inventIDs.map((inventID, index) => {
          const inventory = invents.find(
            (item) => item._id.toString() === inventID
          );
          if (inventory) {
            inventory.image = req.files[index].path;
            return inventory.save();
          }
          return Promise.resolve(null);
        })
      );
      return res.json({ status: 200 });
    } catch (err) {
      console.log(err);
      return res.json({ status: 500 });
    }
  }
);

export default router;
