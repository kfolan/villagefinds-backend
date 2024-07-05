import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const StyleSchema = new Schema({
  productId: {
    type: ObjectId,
    ref: "product",
  },
  name: String,
  discount: Number,
  status: String,
  attributes: [
    {
      name: String,
      values: [String],
    },
  ],
  inventories: [
    {
      type: ObjectId,
      ref: "inventory",
    },
  ],
});

export default mongoose.model("style", StyleSchema);
