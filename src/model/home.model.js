import { Schema, model } from "mongoose"

const homeSchema = new Schema({
    slider: {
        type: Object
    },
    how: {
        type: Object
    },
    shop: {
        type: Object
    },
    community: {
        type: Object,
    },
    ready: {
        type: Object,
    }
});
export default model("home", homeSchema);