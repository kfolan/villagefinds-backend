import {Schema, model} from "mongoose"

const homepageSchema = new Schema({
    title_text: {
        type: String,
    },
    title_subtext: {
        type: String,
    },
    slider_images: {
        type: [String],
    },
    how_it_works_title_text: {
        type: String,
    },
    how_it_works_image: {
        type: String,
    },
    shop_internally_title: {
        type: String,
    },
    shop_internally_subtext: {
        type: String,
    },
    how_it_works_hero_image: {
        type: String,
    },
    how_it_works_side_image: {
        type: String,
    },
    how_it_works_body: {
        type: String,
    },
    vendor_slider_images: {
        type: [String],
    },
    ready_to_shop_images: {
        type: [String],
    }
});
export default model("Homepage", homepageSchema);