const mongoose = require("mongoose");


const postSchema = mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    date:{
        type: Date,
        default: Date.now()
    },
    title:String ,
    content: String,
    postpic:{
        type:String,
        default:"postimg",
        required:true
      },
    likes :[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    ],
    // comments: {
    //     type: Number,
    //     default: 0
    // }

}, { timestamps: true });

module.exports = mongoose.model("post", postSchema);
 