import { Schema, default as mongoose } from "mongoose";

const ObjectID = mongoose.Types.ObjectId;

const ReviewSchema = new Schema({
  customerID: {
    type: ObjectID,
    ref: "customer",
  },
  productID: {
    type: ObjectID,
    ref: "product",
  },
  title: String,
  body: String,
  rating: Number,
  isverified: Boolean,
  createdAt: Date,
});

export default mongoose.model("review", ReviewSchema);
