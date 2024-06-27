import { model, Schema, Types } from 'mongoose'

const ObjectId = Types.ObjectId;

const ParcelSchema = new Schema({
  vendorID: {
    type: ObjectId,
    ref: 'vendor'
  },
  parcelID: String,
  name: String,
  width: Number,
  height: Number,
  length: Number,
  thickness: Number,
  emptyWeight: Number,
  maxWeight: Number,
  sizeUnit: String,
  massUnit: String
});

export default model('parcel', ParcelSchema)