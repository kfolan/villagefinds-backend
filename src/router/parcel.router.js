import express from 'express';

import vendorMiddleware from '../middleware/vendor.middleware';
import parcelModel from '../model/parcel.model';
import { createParcel } from '../utils/shippo';

const router = express.Router();

router.get('/:id', vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const parcel = await parcelModel.findById(id);
    if (!parcel) res.send({ status: 404 });
    else res.send({ status: 200, parcel });
  } catch (err) {
    throw err;
  }
});

router.get('/', vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  try {
    const parcels = await parcelModel.find({ vendorID: vendor._id });
    res.send(parcels);
  } catch (err) {
    throw err;
  }
});

router.post('/', vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const parcel = req.body;
  try {
    if (!vendor.shippoAccountID) return res.send({ status: 400 });
    const shippoParcel = await createParcel({ accountID: vendor.shippoAccountID, parcel });
    await parcelModel.create({ ...parcel, vendorID: vendor._id, parcelID: shippoParcel.objectId });
    return res.send({ status: 200 });
  } catch (err) {
    throw err;
  }
});

router.put('/:id', vendorMiddleware, async (req, res) => {
  const parcel = req.body;
  const { id } = req.params;
  try {
    await parcelModel.findByIdAndUpdate(id, parcel);
    return res.send({ status: 200 });
  } catch (err) {
    throw err;
  }
});

router.delete('/:id', vendorMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await parcelModel.findByIdAndDelete(id);
    res.send({ status: 200 });
  } catch (err) {
    throw err;
  }
});

export default router;