import { Schema, model } from "mongoose";

const customerEventSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: "customer",
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: "community.events",
  },
  name: String,
  height: String,
  weight: String,
  attending: String,
  submited_at: Date,
});

export default model("customerevent", customerEventSchema);
