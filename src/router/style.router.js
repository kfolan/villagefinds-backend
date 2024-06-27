import express from "express";

import inventoryModel from "../model/inventory.model";
import styleModel from "../model/style.model";

import vendorMiddleware from "../middleware/vendor.middleware";
import productModel from "../model/product.model";

const router = express.Router();

router.get(
  "/customer",
  /*customerMiddleware,*/ async (req, res) => {
    const { productId } = req.query;
    const styles = await styleModel
      .find({ productId })
      .populate("inventories")
      .select("-productId");
    return res.json({ status: 200, styles });
  }
);

router.get("/vendor", vendorMiddleware, async (req, res) => {
  const { productId } = req.query;
  const styles = await styleModel
    .find({ productId })
    .select("-productId -inventories");

  const product = await productModel.findById(productId);

  return res.json({ status: 200, styles, orderIDS: product.stylesOrder });
});

router.get("/:id", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const style = await styleModel.findById(id).populate("inventories");
    return res.json({ status: 200, style });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

router.post("/", vendorMiddleware, async (req, res) => {
  const { productId } = req.query;
  const { name, attributes } = req.body;

  try {
    const style = await styleModel.create({
      productId,
      name,
      attributes,
    });
    const product = await productModel.findById(productId);
    product.stylesOrder = [...(product.stylesOrder || []), style._id];
    await product.save();
    return res.json({ status: 200, styleId: style._id });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

router.put("/:id", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, attributes } = req.body;

  try {
    await styleModel.findByIdAndUpdate(id, { name, attributes });
    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

router.put("/:id/discount", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { discount } = req.body;

  try {
    const style = await styleModel.findById(id);
    style.discount = discount;
    await style.save();

    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

router.put("/:id/status", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const style = await styleModel.findById(id);
    style.status = status;
    await style.save();

    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

router.put("/order/place", vendorMiddleware, async (req, res) => {
  try {
    const { productID } = req.query;
    const order = req.body;
    const product = await productModel.findById(productID);
    product.stylesOrder = order;
    await product.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.put("/:id/inventory", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  const inventories = req.body || [];

  console.log(inventories);

  try {
    const style = await styleModel.findById(id);
    const styleInvents = style.inventories || [];
    let savingJson = [];
    if (styleInvents.length === 0) {
      const invents = await Promise.all(
        inventories.map(
          (item) =>
            new Promise((resolve, reject) => {
              inventoryModel
                .create({
                  styleId: style._id,
                  productId: style.productId,
                  ...item,
                })
                .then((res) => resolve(res))
                .catch((err) => reject(err));
            })
        )
      );
      savingJson = invents.map((item) => item._id);
      style.inventories = savingJson;
      await style.save();
    } else {
      styleInvents.forEach(async (inventID) => {
        const item = inventories.find(
          (item) => item._id === inventID.toString()
        );
        if (item) {
          await inventoryModel.findByIdAndUpdate(inventID, {
            ...item,
          });
        }
      });
      savingJson = styleInvents.map((item) => item.toString());
    }

    return res.json({ status: 200, ids: savingJson });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.put("/place", vendorMiddleware, async (req, res) => {
  try {
  } catch (err) { }
});

export default router;
