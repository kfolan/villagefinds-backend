import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;

const ShipmentSchema = {
  cartID: {
    type: ObjectId,
    ref: 'cart'
  },
  addressFrom: Object,
  addressTo: Object,
  parcels: [Object],
  carrierAccount: String,
  serviceLevelToken: String,
};

export default mongoose.model('shipment', ShipmentSchema);