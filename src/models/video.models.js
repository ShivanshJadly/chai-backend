import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // Read about mogoose aggregate

const videoSchema = new Schema({

    videoFile:{
        type: String, // cloudinary url
        required: true
    },
    thumbnail:{
        type: String, // cloudinary url
        required: true
    },
    title:{
        type: String, 
        required: true
    },
    description:{
        type: String, 
        required: true
    },
    duration:{
        type: Number,
        required: true
    },
    views:{
        type: Number,
        default: 0
    },
    isPublished:{
        type: Boolean,
        default: true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }

},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate); // now we can write aggregation queries that actually level up things for us

export const Video = mongoose.model("Video",videoSchema);