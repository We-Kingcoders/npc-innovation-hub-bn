import multer from "multer";
import fs from "fs";

const uploadDir = "uploads/documents/";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // Was `Date.now() + "-" + file.originalname` - the raw client-supplied
  // filename, unsanitized, reaching the filesystem directly. A name like
  // "../../../etc/whatever" would traverse out of uploadDir, and nothing
  // stopped an arbitrary extension (.php, .exe, ...) from landing there
  // either. Matches the pattern already used in member.route.ts: keep
  // only the extension, discard the rest of the client-supplied name.
  filename: (req, file, cb) => {
    const extension = file.originalname.split(".").pop();
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`);
  },
});

// This config backs the profile-image upload (PATCH /update-profile,
// upload.single('images')) - had no fileFilter or limits at all, so any
// file type and any size was accepted before it ever reached Cloudinary.
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed!"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default upload;
