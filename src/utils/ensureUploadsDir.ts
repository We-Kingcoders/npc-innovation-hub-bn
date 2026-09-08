import fs from 'fs';

/**
 * Every route below writes uploaded files to 'uploads/' via
 * multer.diskStorage's `destination` callback, which does NOT create the
 * directory itself - multer just fails the write (surfaced as a 400 via
 * each route's multerErrorHandler) if it's missing. 'uploads/' is
 * gitignored (it holds real user-submitted files - see .gitignore), so it
 * doesn't exist at all on a fresh checkout.
 *
 * This was previously masked by luck rather than design: src/utils/
 * multerConfig.ts creates 'uploads/documents/' for the profile-photo
 * route, which - as a side effect of `fs.mkdirSync(..., { recursive: true
 * })` - also creates the 'uploads/' parent. As long as that file happened
 * to load before some other route needed 'uploads/' to exist, uploads
 * worked; otherwise (e.g. a Jest test file that only imports the specific
 * route under test, or any fresh environment where import order differs)
 * they 400. Confirmed live: this exact failure hit 5 CI test suites whose
 * local runs never exercised user.route.ts first.
 *
 * Importing this file (for its side effect - every uploads/-writing route
 * does `import '../utils/ensureUploadsDir'`) makes the directory's
 * existence an explicit guarantee instead of an accidental one.
 */
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export default uploadsDir;
