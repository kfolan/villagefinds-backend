import { Schema, default as mongoose } from "mongoose";

const SubscriptionSchema = new Schema({
    name: String,
    description: String,
    monthInvest: Number,
    expectedFee: Number,
    transactionFee: Number,
    benefits: [String],
    status: String
})

export default mongoose.model('subscription', SubscriptionSchema)