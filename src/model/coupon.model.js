import { Schema, model } from "mongoose";

export const CouponType = Object.freeze({
  FreeShipping: 'freeshipping',
  Percent: 'percent',
  Tiered: 'tiered'
});

const schema = new Schema({
  name: String,
  type: {
    type: String,
    enum: Object.values(CouponType)
  },
  shipping: {
    mode: String,
    code: String,
    amount: Number
  },
  percent: {
    code: String,
    discount: Number
  },
  conditions: [
    {
      discount: Number,
      minimum: Number,
      maximum: Number
    }
  ],
  target: {
    mode: String,
    id: String
  },
  startDate: Date,
  endDate: Date,
  status: String
});

export default model("coupon", schema);
