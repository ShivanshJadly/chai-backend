import multer from "multer"; // Read docs (take overview how this works)

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {
    /*
    // this creates a unique name for our file so that nothing gets overwrite if found similar name files
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
    */

    cb(null, file.originalname)
  }
})

export const upload = multer({
    storage
})