import {Schema, model} from "mongoose"

const schema = new Schema({
    name: {
        type: String,
        unique: true,
    },
    status: {
        type: String,
    }
});

export default model("category", schema);