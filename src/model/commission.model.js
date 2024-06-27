import { Schema, default as mongoose } from "mongoose";

const ObjectID = mongoose.Types.ObjectId;

const CommissionSchema = new Schema({
    community: {
        type: ObjectID,
        ref: 'community'
    },
    date: Date,
    earned: Number,
    status: String,
})

export default mongoose.model('commission', CommissionSchema);