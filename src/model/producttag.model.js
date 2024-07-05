import {Schema, model} from "mongoose"

const schema = new Schema({
    name: {
        type: String,
    },
    status: {
        type: String,
    }
})

export default model("producttag", schema);