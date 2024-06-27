import {Schema, model} from "mongoose"

const footerSchema = new Schema({
    facebook: {
        type: String,
    },
    instagram: {
        type: String,
    },
    youtube: {
        type: String,
    },
    linkedin: {
        type: String,
    },
    phone: {
        type: String,
    },
    email: {
        type: String,
    }
});
export default model("footer", footerSchema);