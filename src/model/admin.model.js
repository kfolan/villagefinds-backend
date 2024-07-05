import { Schema, model } from "mongoose"

const schema = new Schema({
    email: String,
    phone: String,
    password: String
});

export default model("admin", schema);