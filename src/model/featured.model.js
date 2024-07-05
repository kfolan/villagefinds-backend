import { Schema, model } from "mongoose"

const featuredSchema = new Schema({
    title: {
        type: String,
    },
    name: {
        type: String,
    },
    price: {
        type: Number,
    },
    tags: {
        type: [String],
    },
    image: {
        type: String,
    },
    description: {
        type: String,
    },
    link: {
        type: String,
    }
})

export default model("featured", featuredSchema);