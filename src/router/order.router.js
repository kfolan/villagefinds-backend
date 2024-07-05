import express from "express";
import mongoose from 'mongoose';

import orderModel from "../model/order.model";
import customerMiddleware from "../middleware/customer.middleware";
import vendorMiddleware from "../middleware/vendor.middleware";

const router = express.Router();
const ObjectID = mongoose.Types.ObjectId;

router.get('/customer', customerMiddleware, async (req, res) => {
  const customer = req.customer;
  try {
    const orders = await orderModel.aggregate([
      { $match: { customerID: new ObjectID(customer._id) } },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorID',
          foreignField: '_id',
          as: 'vendorID'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$vendorID', 0] },
          orderDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$orderDate"
            }
          }
        }
      },
      {
        $group: {
          _id: { orderDate: '$orderDate' },
          orderItems: {
            $push: '$$ROOT'
          }
        }
      },
      { $project: { _id: 0, orderDate: '$_id.orderDate', orderItems: 1 } },
    ]);
    res.send(orders);
  } catch (err) {
    console.log(err);
  }
});

router.get('/customer/:id', customerMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await orderModel.findById(id).populate({ path: 'vendorID' });
    res.send(order);
  } catch (err) {
    console.log(err);
  }
});

router.get("/vendor", vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const { name, sort, status, from, to } = req.query;
  const filterParams = { vendorID: new ObjectID(vendor._id) };
  let sortPipelines = [];

  if (name) filterParams['customer.name'] = new RegExp(name, 'i');
  if (status) filterParams.status = status;
  if (from || to) {
    filterParams.orderDate = {};
    if (from) filterParams.orderDate.$gte = new Date(from);
    if (to) filterParams.orderDate.$lte = new Date(to);
  }

  if (sort) {
    if (sort === 'alphabeta') sortPipelines = [{ $sort: { 'customerID.name': -1 } }];
    else if (sort === 'subscription') {
      sortPipelines = [
        { $addFields: { hasSubscription: { $cond: { if: { $gt: [{ $type: "$product.subscription" }, "missing"] }, then: 1, else: 0 } } } },
        { $sort: { hasSubscription: -1 } },
        { $project: { hasSubscription: 0 } }
      ];
    }
    else {
      sortPipelines = [
        { $addFields: { styleOrder: { $cond: { if: { $eq: ['$deliveryType', sort] }, then: -1, else: 1 } } } },
        { $sort: { styleOrder: 1 } },
        { $project: { styleOrder: 0 } }
      ];
    }
  }

  try {
    const orders = await orderModel.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customerID',
          foreignField: '_id',
          as: 'customerID'
        }
      },
      {
        $addFields: {
          customer: {
            $arrayElemAt: ['$customerID', 0]
          }
        }
      },
      { $addFields: { 'customer.name': { $concat: ['$customer.firstName', ' ', '$customer.lastName'] } } },
      { $project: { customerID: 0 } },
      { $match: filterParams },
      ...sortPipelines
    ]);
    return res.send(orders);
  } catch (err) {
    throw new Error(err);
  }
});

router.get("/admin", /*adminMiddleware,*/ async (req, res) => {
  const { name, sort, status, from, to } = req.query;
  const filterParams = {};
  let sortPipelines = [];

  if (name) filterParams['customer.name'] = new RegExp(name, 'i');
  if (status) filterParams.status = status;
  if (from || to) {
    filterParams.orderDate = {};
    if (from) filterParams.orderDate.$gte = new Date(from);
    if (to) filterParams.orderDate.$lte = new Date(to);
  }

  if (sort) {
    if (sort === 'alphabeta') sortPipelines = [{ $sort: { 'customerID.name': -1 } }];
    else if (sort === 'subscription') {
      sortPipelines = [
        { $addFields: { hasSubscription: { $cond: { if: { $gt: [{ $type: "$product.subscription" }, "missing"] }, then: 1, else: 0 } } } },
        { $sort: { hasSubscription: -1 } },
        { $project: { hasSubscription: 0 } }
      ];
    }
    else {
      sortPipelines = [
        { $addFields: { styleOrder: { $cond: { if: { $eq: ['$deliveryType', sort] }, then: -1, else: 1 } } } },
        { $sort: { styleOrder: 1 } },
        { $project: { styleOrder: 0 } }
      ];
    }
  }

  try {
    const orders = await orderModel.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customerID',
          foreignField: '_id',
          as: 'customerID'
        }
      },
      {
        $addFields: {
          customer: {
            $arrayElemAt: ['$customerID', 0]
          }
        }
      },
      { $addFields: { 'customer.name': { $concat: ['$customer.firstName', ' ', '$customer.lastName'] } } },
      { $project: { customerID: 0 } },
      { $match: filterParams },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorID',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ["$vendor", 0] },
        },
      },
      ...sortPipelines
    ]);
    return res.send(orders);
  } catch (err) {
    throw new Error(err);
  }
});

router.get("/vendor/:id", vendorMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id).populate('customerID');
    return res.send(order);
  } catch (err) {
    throw new Error(err);
  }
});

router.get("/admin/:id", /*adminMiddleware,*/ async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id).populate('customerID');
    return res.send(order);
  } catch (err) {
    throw new Error(err);
  }
});

router.post("/vendor", async (req, res) => {
  await orderModel.create(req.body);
  return res.send({ status: 200 });
});

router.put('/vendor/:id', vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  const order = req.body;
  try {
    await orderModel.findByIdAndUpdate(id, order);
    return res.send({ status: 200 });
  } catch (err) {
    console.log(err);
  }
});

router.put('/admin/:id', /*adminMiddleware,*/ async (req, res) => {
  const { id } = req.params;
  const order = req.body;
  try {
    await orderModel.findByIdAndUpdate(id, order);
    return res.send({ status: 200 });
  } catch (err) {
    console.log(err);
  }
});

export default router;
