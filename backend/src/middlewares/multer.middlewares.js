import multer from "multer";
import path from "path";

// The purpose of this Multer storage code is to save user-uploaded files on disk with unique filenames so they don’t overwrite each other.

const storage = multer.diskStorage({// This tells multer to store files on disc(not memory).
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) { /*This decides what name the file will get in the temp folder. */
    // Bug fix: Never use file.originalname directly — it is attacker-controlled and can
    // contain path-traversal sequences (e.g. "../../src/app.js") and causes collisions
    // when two users upload files with the same name simultaneously.
    const ext = path.extname(file.originalname).toLowerCase(); // preserve extension, normalise case
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
})



/*Another alternate code that may be able to achieve that is:- */

/*const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp/my-uploads')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // .jpg, .png
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueName + ext);
  }
})

const upload = multer({ storage: storage }) */

// The first code is more dangerous because there if two users upload files with same name then one of the files will get over written

export const upload = multer({
  storage
})