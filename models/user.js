const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/miniProject");

const userSchema = mongoose.Schema({
  name: String,
  age: Number,
  email: String,
  password: String, 
  profilepic:{
    type:String,
    default:"user.png"
  },
  post: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
  ],
});

module.exports = mongoose.model("user", userSchema);
 