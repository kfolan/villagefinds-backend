import { Schema, model } from "mongoose";

const customerSchema = new Schema({
  stripeCustomerID: String,
  firstName: String,
  lastName: String,
  phone: String,
  email: {
    type: String,
    unique: true,
  },
  address: String,
  addressBook: [
    {
      name: String,
      address: String,
      extras: String,
      default: Boolean
    }
  ],
  zipcode: String,
  password: String,
  status: String,
  signup_at: Date,
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

customerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
})

export default model("customer", customerSchema);
