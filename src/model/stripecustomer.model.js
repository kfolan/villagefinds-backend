import { Schema, default as mongoose } from "mongoose";

const ObjectID = mongoose.Types.ObjectId;
const StripeCustomerSchema = new Schema({
  customerID: {
    type: ObjectID,
    ref: "customer",
  },
  vendorConnectedID: String,
  stripeCustomerID: String,
  paymentMethodID: String,
});

export default mongoose.model("stripecustomer", StripeCustomerSchema);
