import { Router } from "express";
import * as mongoose from "mongoose";

import productModel from "../model/product.model";
import styleModel from '../model/style.model';
import inventoryModel from '../model/inventory.model';
import orderModel from "../model/order.model";

import vendorMiddleware from "../middleware/vendor.middleware";
import uploadMiddleware from "../multer";

const router = Router();
const ObjectId = mongoose.Types.ObjectId;

router.get("/public", async (req, res) => {
  const {
    community,
    vendor,
    type,
    search,
    category,
    sort,
    minPrice,
    maxPrice,
    featured,
  } = req.query;

  const filter = {
    $or: [
      { name: { $regex: search || "", $options: "i" } },
      { "vendor.business.name": { $regex: search || "", $options: "i" } },
    ],
  };
  if (community) filter["vendor.community"] = new ObjectId(community);
  if (vendor) filter["vendor._id"] = new ObjectId(vendor);
  if (category) filter.category = category;
  if (minPrice) filter.price = { $gte: Number(minPrice) };
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };
  const products = await productModel.aggregate([
    ...(type === "subscription"
      ? [{ $match: { subscription: { $exists: true, $ne: null } } }]
      : []),
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $match: filter,
    },
    ...(featured ? [{ $limit: 8 }] : []),
    {
      $sort: ["ascending", "descending"].includes(sort)
        ? {
          name: sort === "ascending" ? 1 : -1,
        }
        : { createdAt: 1 },
    },
    {
      $addFields: {
        tags: {
          $cond: {
            if: {
              $and: [
                { $in: ["Local Subscriptions", "$deliveryTypes"] },
                { $ne: ['$subscription', null] }
              ]
            },
            then: ["Subscription", "Near By"],
            else: {
              $cond: {
                if: {
                  $in: ["Near By", "$deliveryTypes"],
                },
                then: ["Near By"],
                else: {
                  $cond: {
                    if: { "$eq": [{ "$ifNull": ["$subscription", ""] }, ""] },
                    then: [],
                    else: ["Subscription"],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: "",
              category: "",
              name: "",
              shopName: "",
              price: 0,
              image: "",
              tags: [],
            },
            {
              _id: "$_id",
              category: "$category",
              name: "$name",
              shopName: "$vendor.business.name",
              price: "$price",
              image: "$image",
              tags: "$tags",
            },
          ],
        },
      },
    },
  ]);
  return res.send(products);
});
router.get("/subscription", async (req, res) => {
  const {
    community,
    vendor,
    type,
    search,
    category,
    sort,
    minPrice,
    maxPrice,
    featured,
  } = req.query;

  const filter = {
    $or: [
      { name: { $regex: search || "", $options: "i" } },
      { "vendor.business.name": { $regex: search || "", $options: "i" } },
    ],
  };
  if (community) filter["vendor.community"] = new ObjectId(community);
  if (vendor) filter["vendor._id"] = new ObjectId(vendor);
  if (category) filter.category = category;
  if (minPrice) filter.price = { $gte: Number(minPrice) };
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };
  const products = await productModel.aggregate([
    ...(type === "subscription"
      ? [{ $match: { subscription: { $exists: true, $ne: null } } }]
      : []),
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $match: filter,
    },
    ...(featured ? [{ $limit: 8 }] : []),
    {
      $sort: ["ascending", "descending"].includes(sort)
        ? {
          name: sort === "ascending" ? 1 : -1,
        }
        : { createdAt: 1 },
    },
    {
      $addFields: {
        tags: {
          $cond: {
            if: {
              $and: [
                { $in: ["Local Subscriptions", "$deliveryTypes"] },
                { $ne: ['$subscription', null] }
              ]
            },
            then: ["Subscription"],
            else: {
              $cond: {
                if: { "$eq": [{ "$ifNull": ["$subscription", ""] }, ""] },
                then: [],
                else: ["Subscription"],
              },
            }
          },
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: "",
              category: "",
              name: "",
              shopName: "",
              price: 0,
              image: "",
              tags: [],
            },
            {
              _id: "$_id",
              category: "$category",
              name: "$name",
              shopName: "$vendor.business.name",
              price: "$price",
              image: "$image",
              tags: "$tags",
            },
          ],
        },
      },
    },
  ]);
  return res.send(products);
});

router.get('/gift', async (req, res) => {
  try {
    const results = await orderModel.aggregate([
      { $match: { 'gift.name': { $exists: true, $ne: "" } } },
      { $sort: { 'orderDate': -1 } },
      { $limit: 1 },
      {
        $project: {
          image: '$product.image',
          name: '$product.name',
          price: '$product.price',
          quantity: '$product.quantity',
          subtotal: '$product.subtotal',
          discount: '$product.discount',
          category: '$product.category',
          tags: '$product.tags',
          description: '$product.description',
          soldByUnit: '$product.soldByUnit'
        }
      }
    ]);
    res.send({ topGift: results });
  } catch (err) {
    throw err;
  }
});

router.get("/vendor", vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const { name, sortBy, id, sku } = req.query;
  const nameAndIdFilter = {
    name: {
      $regex: name || "",
      $options: "i",
    },
    id: {
      $regex: id || "",
      $options: "i",
    },
  };
  const skuFilter = {
    sku: {
      $regex: sku || "",
      $options: "i",
    },
  };
  const sort = {};
  if (sortBy === "newest") {
    sort.createdAt = -1;
  } else if (sortBy === "oldest") {
    sort.createdAt = 1;
  } else if (sortBy === "active") {
    sort.status = 1;
  } else if (sortBy === "inactive") {
    sort.status = -1;
  }
  const products = await productModel.aggregate([
    {
      $match: { vendor: new ObjectId(vendor._id) },
    },
    { $match: nameAndIdFilter },
    {
      $project: {
        name: 1,
        status: 1,
        specification: {
          $first: {
            $filter: {
              input: "$specifications",
              as: "specification",
              cond: {
                $eq: ["$$specification.name", "sku"],
              },
            },
          },
        },
        image: 1,
        createdAt: 1,
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: "",
              name: "",
              status: "",
              image: "",
              sku: "",
              createdAt: "",
            },
            {
              _id: "$_id",
              name: "$name",
              status: "$status",
              image: '$image',
              sku: "$specification.value",
              createdAt: "$createdAt",
            },
          ],
        },
      },
    },
    { $match: skuFilter },
    { $sort: sort },
  ]);

  return res.send(products);
});

router.get("/vendor/:id", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productModel.findById(id);
    return res.json({ status: 200, product });
  } catch (err) {
    return res.json({ status: 404 });
  }
});

router.get('/vendor/:id/style', vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productModel.findById(id).populate('stylesOrder');
    if (!product) {
      res.send({ status: 404 });
    } else {
      return res.send(product.stylesOrder);
    }
  } catch (err) {
    console.log(err);
  }
})

router.get(
  "/customer/:id",
  async (req, res) => {
    const { id } = req.params;
    try {
      const products = await productModel.aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: "vendors",
            localField: "vendor",
            foreignField: "_id",
            as: "vendor",
          },
        },
        {
          $lookup: {
            from: "communities",
            localField: "vendor.community",
            foreignField: "_id",
            as: "community",
          },
        },
        {
          $lookup: {
            from: "styles",
            localField: "stylesOrder",
            foreignField: "_id",
            as: "styles",
          },
        },
        {
          $lookup: {
            from: 'inventories',
            localField: '_id',
            foreignField: 'productId',
            as: 'inventories'
          }
        },
        {
          $unwind: "$vendor",
        },
        {
          $unwind: "$community",
        },
        {
          $project: {
            name: 1,
            price: 1,
            image: 1,
            more: {
              shortDesc: "$shortDesc",
              longDesc: "$longDesc",
              disclaimer: "$disclaimer",
              specifications: "$specifications",
            },
            vendor: {
              _id: 1,
              shopName: '$vendor.business.name',
            },
            community: {
              _id: 1,
              name: 1,
              slug: 1,
              "images.logoUrl": 1,
            },
            styles: 1,
            inventories: {
              _id: 1,
              styleId: 1,
              attrs: 1,
              image: 1,
              price: 1,
              parcel: 1,
            },
            parcel: 1,
            customization: 1,
            subscription: 1,
            soldByUnit: 1,
            deliveryTypes: 1,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                {
                  more: "$more",
                  order: {
                    _id: '$_id',
                    name: "$name",
                    price: '$price',
                    image: '$image',
                    vendor: "$vendor",
                    community: "$community",
                    styles: "$styles",
                    inventories: "$inventories",
                    customization: "$customization",
                    subscription: "$subscription",
                    soldByUnit: "$soldByUnit",
                    deliveryTypes: "$deliveryTypes",
                    parcel: "$parcel"
                  },
                },
              ],
            },
          },
        },
      ]);

      if (products.length === 1) {
        return res.json({ status: 200, product: products[0] });
      }
      return res.json({ status: 404 });

    } catch (err) {
      console.log(err);
      return res.json({ status: 500 });
    }
  }
);

router.get("/:id/:category", vendorMiddleware, async (req, res) => {
  const { id, category } = req.params;
  const product = await productModel.findById(id);

  try {
    if (category === "style") {
      const { styleId } = req.query;
      if (styleId) {
        const style = (product.styles || []).find(
          (item) => item._id.toString() === styleId
        );
        return res.json({ status: 200, style });
      }
      return res.json({ status: 200, styles: product.styles || [] });
    } else if (category === "specification") {
      return res.json({
        status: 200,
        specifications: product.specifications || [],
      });
    } else if (category === "customization") {
      return res.json({
        status: 200,
        iscustomizable: product.iscustomizable,
        customization: product.customization || {},
      });
    } else if (category === "subscription") {
      return res.json({ status: product.subscription });
    }
    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 404 });
  }
});

router.post(
  "/",
  vendorMiddleware,
  async (req, res) => {
    const vendor = req.vendor;
    const reqJson = req.body;
    try {
      const totalCount = await productModel.countDocuments();
      const product = await productModel.create({
        ...reqJson,
        id: `${totalCount + 1}`,
        status: 'active',
        vendor: vendor._id
      });
      const { styles } = reqJson;
      const styleResults = await Promise.all(styles.map(async style => {
        const styleResult = await styleModel.create({ ...style, inventories: [], productId: product._id });
        const inventResults = await Promise.all(style.inventories.map(invent =>
          inventoryModel.create({ ...invent, productId: product._id, styleId: styleResult._id })
        ));
        styleResult.inventories = inventResults.map(item => item._id);
        return styleResult.save();
      }
      ));
      product.stylesOrder = styleResults.map(item => item._id);
      await product.save();
      if (!vendor.isProduct) {
        vendor.isProduct = true;
        await vendor.save();
      }
      const styleInvents = styleResults.map(style => ({ styleID: style._id, inventories: style.inventories.map(invent => invent._id) }));
      return res.json({ status: 200, product: product._id, styleInvents });
    } catch (err) {
      console.log(err);
      return res.json({ status: 500 });
    }
  }
);

router.post("/:id/:category", vendorMiddleware, async (req, res) => {
  const { id, category } = req.params;

  try {
    const product = await productModel.findById(id);
    if (category === "specification") {
      const spec = req.body;
      const { specId } = req.query;
      const specifications = product.specifications;
      if (specifications.find((item) => item._id.toString() === specId)) {
        product.specifications = specifications.map((item) =>
          item._id.toString() === specId ? { ...item, ...spec } : item
        );
      } else {
        product.specifications = [...specifications, spec];
      }
    } else if (category === "customization") {
      const custom = req.body;
      product.customization = custom;
    } else if (category === "subscription") {
      const subscribe = req.body;
      product.subscription = subscribe;
    }
    await product.save();
    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 404 });
  }
});

router.put(
  "/:id",
  vendorMiddleware,
  uploadMiddleware.fields([{ name: 'nutrition' }, { name: 'image' }]),
  async (req, res) => {
    const { id } = req.params;
    const {
      name,
      deliveryTypes,
      category,
      status,
      shortDesc,
      longDesc,
      disclaimer,
      soldByUnit,
      tax,
      parcel
    } = req.body;
    const image = (req.files && req.files.image && req.files.image[0]) || null;
    const nutrition = (req.files && req.files.nutrition && req.files.nutrition[0]) || null;
    console.log(parcel)

    try {
      const product = await productModel.findById(id);
      if (name) product.name = name;
      if (category) product.category = category;
      if (shortDesc) product.shortDesc = shortDesc;
      if (longDesc) product.longDesc = longDesc;
      if (disclaimer) product.disclaimer = disclaimer;
      if (soldByUnit) product.soldByUnit = soldByUnit;
      if (tax) product.tax = tax;
      if (nutrition) product.nutrition = nutrition.path;
      if (deliveryTypes) product.deliveryTypes = JSON.parse(deliveryTypes);
      if (parcel) product.parcel = JSON.parse(parcel);
      if (image) product.image = image.path;
      if (status) product.status = status;
      await product.save();
      return res.json({ status: 200 });
    } catch (err) {
      console.error(err);
      return res.json({ status: 500 });
    }
  }
);

router.put("/:id/:category", vendorMiddleware, async (req, res) => {
  const { id, category } = req.params;

  try {
    const product = await productModel.findById(id);
    if (category === "specification") {
      const specifications = req.body;
      product.specifications = specifications;
    }
    await product.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 404 });
  }
});

router.delete("/:id", vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await productModel.findByIdAndDelete(id);
    return res.send({ status: 200 });
  } catch (err) {
    console.log(err);
    throw err;
  }
});

export default router;
