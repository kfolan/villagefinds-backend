import { Schema, default as mongoose } from "mongoose";

const ObjectID = mongoose.Types.ObjectId;
const StripeAccountSchema = new Schema({
  vendorID: {
    type: ObjectID,
    ref: "vendor",
  },
  stripeAccountID: String,
});

export default mongoose.model("stripeaccount", StripeAccountSchema);
