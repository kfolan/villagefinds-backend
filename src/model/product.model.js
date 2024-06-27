import mongoose, { Schema, model } from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

const productSchema = new Schema({
  id: String,
  vendor: {
    type: ObjectId,
    ref: "vendor",
  },
  name: String,
  category: String,
  tags: [String],
  deliveryTypes: [String],
  shortDesc: String,
  longDesc: String,
  disclaimer: String,
  nutrition: String,
  soldByUnit: String,
  price: Number,
  quantity: Number,
  image: String,
  tax: String,
  parcel: {
    width: String,
    height: String,
    length: String,
    weight: String,
    distanceUnit: String,
    massUnit: String
  },
  specifications: [
    {
      name: String,
      value: String,
    },
  ],
  iscustomizable: Boolean,
  customization: {
    customText: String,
    fee: Number,
  },
  subscription: {
    iscsa: Boolean,
    frequencies: [String],
    discount: Number,
    csa: {
      frequency: String,
      duration: Number,
      startDate: Date,
      endDate: Date
    }
  },
  stylesOrder: [{ type: ObjectId, ref: 'style' }],
  createdAt: Date,
  status: String,
});
export default model("product", productSchema);
