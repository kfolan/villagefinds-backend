import { Schema, default as mongoose } from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

const OrderSchema = new Schema({
  orderID: Number,
  vendorID: {
    type: ObjectId,
    ref: "vendor",
  },
  customerID: {
    type: ObjectId,
    ref: 'customer'
  },
  deliveryType: String,
  shippingInfo: {
    trackingNumber: String,
    trackingStatus: {
      status: String,
      statusDetails: String,
      statusDate: Date
    },
    rate: {
      service: String,
      amount: Number
    }
  },
  deliveryInfo: {
    classification: String,
    address: String,
    instruction: String,
    isSubstitute: Boolean,
  },
  locationInfo: {
    instruction: String,
    name: String,
    address: String,
    pickDate: Date,
    pickTime: String,
  },
  pickupInfo: {
    address: String,
  },
  gift: {
    name: String,
    email: String,
    phone: String,
    message: String,
  },
  customer: {
    email: String,
    phone: String,
    address: String,
  },
  personalization: String,
  subscription: {
    subscriptionID: String,
    iscsa: Boolean,
    csa: {
      startDate: String,
      endDate: String,
      duration: Number,
      cycle: Number
    },
    frequency: {
      interval: Number,
      period: String,
    },
    status: String,
  },
  product: {
    image: String,
    name: String,
    category: String,
    tags: [String],
    subscription: {
      iscsa: Boolean,
      subscribe: String,
      frequencies: [String],
      discount: Number,
      csa: {
        duration: Number,
        frequency: String,
        startDate: Date,
        endDate: Date,
      }
    },
    price: Number,
    quantity: Number,
    discount: Number,
    subtotal: Number,
    description: String,
    soldByUnit: String
  },
  status: String,
  orderDate: Date,
});

export default mongoose.model("order", OrderSchema);
