import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const InventorySchema = new Schema({
  styleId: {
    type: ObjectId,
    ref: "style",
  },
  productId: {
    type: ObjectId,
    ref: "product",
  },
  parcel: {
    width: String,
    height: String,
    length: String,
    weight: String,
    distanceUnit: String,
    massUnit: String
  },
  attrs: [String],
  price: Number,
  quantity: Number,
  image: String,
  status: String,
});

export default mongoose.model("inventory", InventorySchema);
