import { Schema, default as mongoose } from "mongoose";
const ObjectID = mongoose.Types.ObjectId;

const PaymentIntentSchema = new Schema({
  paymentIntentID: String,
  customerID: {
    type: ObjectID,
    ref: "customer",
  },
  paymentMethod: String,
  paymentCard: Object,
  billingDetails: Object,
});

export default mongoose.model("paymentintent", PaymentIntentSchema);
