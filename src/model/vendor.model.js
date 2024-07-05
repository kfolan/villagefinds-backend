import { Schema, model } from "mongoose";
import { Types } from "mongoose";

const vendorSchema = new Schema({
  vendorId: Number,
  community: {
    type: Types.ObjectId,
    ref: "community",
  },
  isLeader: Boolean,
  communityStatus: String,
  stripeAccountID: String,
  shippoAccountID: String,
  shippoCarriers: {
    usps: String,
    ups: String,
    fedex: String
  },
  commission: Number,
  monthlyFee: Number,
  subscription: {
    type: Types.ObjectId,
    ref: 'subscription'
  },
  business: {
    name: String,
    owner: String,
    email: String,
    phone: String,
    address: String,
    zipcode: String,
    password: String,
  },
  socialUrls: {
    facebook: String,
    twitter: String,
    instagram: String,
    pinterest: String,
    youtube: String,
    linkedin: String,
  },
  store: {
    orderCapacity: String,
    shortDesc: String,
    longDesc: String,
    tags: [String],
    radius: Number,
  },
  images: {
    logoUrl: String,
    finderUrl: String,
    slideUrls: [String],
  },
  fulfillment: {
    pickup: {
      leadTime: Number,
      pickupFee: Number,
      days: [
        {
          weekday: Number,
          from: String,
          to: String,
        },
      ],
    },
    delivery: {
      leadTime: Number,
      deliveryFee: Number,
      days: [
        {
          weekday: Number,
          from: String,
          to: String,
        },
      ],
    },
    locations: [
      {
        name: String,
        address: String,
        eventDate: Date,
        pickupWeekday: Number,
        pickupTime: {
          from: String,
          to: String,
        },
        instruction: String,
        charge: Number,
        status: String,
      },
    ],
  },
  shipping: {
    services: [String],
    address: {
      street1: String,
      city: String,
      state: String,
      country: String,
      zip: String
    }
  },
  goals: {
    reason: String,
    business: String,
    revenue: Number,
  },
  rewards: [String],
  isOpen: Boolean,
  isProduct: Boolean,
  signupAt: Date,
  status: String,
});

export default model("vendor", vendorSchema);
