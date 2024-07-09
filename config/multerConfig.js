// diskstorage
//upload variables


const multer  = require("multer");

const crypto = require("crypto");
const path = require("path");
//step-1 diskstorage setup
const storage = multer.diskStorage({
  // ? setting up the file destination
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    //? setting up the filename
    filename: function (req, file, cb) {
        crypto.randomBytes(12,(err,name)=>
        {
            const filename = name.toString("hex")+path.extname(file.originalname)
            cb(null,filename);
        })
    }
  })
  // uplaod variables and exports it
  const upload = multer({ storage: storage })

  module.exports = upload;