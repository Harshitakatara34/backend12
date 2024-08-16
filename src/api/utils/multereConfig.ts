import multer from 'multer';

export const upload = multer({ dest: 'uploads/' }).fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]);