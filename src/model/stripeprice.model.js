import { Schema, default as mongoose } from "mongoose";

const ObjectID = mongoose.Types.ObjectId;
const StripePriceSchema = new Schema({
  cartID: {
    type: ObjectID,
    ref: "cart",
  },
  priceID: String,
});

export default mongoose.model("stripeprice", StripePriceSchema);
