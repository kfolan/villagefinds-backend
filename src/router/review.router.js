import mongoose from "mongoose";
import express from "express";

import reviewModel from "../model/review.model";
import customerMiddleware from "../middleware/customer.middleware";

const router = express.Router();
const ObjectID = mongoose.Types.ObjectId;

router.get("/", async (req, res) => {
  try {
    const { productID, count } = req.query;

    const customers = await reviewModel.countDocuments({
      productID,
      isverified: true,
    });
    const ratings = await reviewModel.aggregate([
      {
        $match: {
          productID: new ObjectID(productID),
          isverified: true,
        },
      },
      {
        $group: {
          _id: null,
          customers: { $sum: 1 },
          total: { $sum: "$rating" },
          rating1: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$rating", 1] }, { $lt: ["$rating", 2] }] },
                1,
                0,
              ],
            },
          },
          rating2: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$rating", 2] }, { $lt: ["$rating", 3] }] },
                1,
                0,
              ],
            },
          },
          rating3: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$rating", 3] }, { $lt: ["$rating", 4] }] },
                1,
                0,
              ],
            },
          },
          rating4: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$rating", 4] }, { $lt: ["$rating", 5] }] },
                1,
                0,
              ],
            },
          },
          rating5: {
            $sum: { $cond: [{ $and: [{ $gte: ["$rating", 5] }] }, 1, 0] },
          }, // No upper bound for rating 5
        },
      },
      {
        $project: {
          _id: 0,
          overall: [
            { rating: 1, count: "$rating1" },
            { rating: 2, count: "$rating2" },
            { rating: 3, count: "$rating3" },
            { rating: 4, count: "$rating4" },
            { rating: 5, count: "$rating5" },
          ],
          average: { $divide: ["$total", "$customers"] },
        },
      },
    ]);

    const reviews = await reviewModel
      .find({
        productID,
      })
      .sort({ isverified: -1, createdAt: -1 })
      .limit(count || 3);

    return res.json({
      ratings: ratings.length > 0 ? ratings[0] : {},
      reviews,
      customers,
    });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get("/check", customerMiddleware, async (req, res) => {
  try {
    const customer = req.customer;
    const { productID } = req.query;
    const checkReview = await reviewModel.findOne({
      productID,
      customerID: customer._id,
    });
    return res.json({ reviewed: !!checkReview });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.post("/", customerMiddleware, async (req, res) => {
  try {
    const customer = req.customer;
    const { productID } = req.query;
    const { title, body, rating } = req.body;
    const checkReview = await reviewModel.findOne({
      productID,
      customerID: customer._id,
    });
    if (checkReview) {
      return res.json({ status: 400 });
    }
    const resultReview = await reviewModel.create({
      productID,
      customerID: customer._id,
      title,
      body,
      rating,
      createdAt: new Date(),
      isverified: true,
    });
    return res.json({ status: 200, review: resultReview });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.delete("/", customerMiddleware, async (req, res) => {
  try {
    const customer = req.customer;
    const { productID } = req.query;
    await reviewModel.findOneAndDelete({
      productID,
      customerID: customer._id,
    });
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

export default router;
