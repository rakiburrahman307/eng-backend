import { Request } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiErrors';

const fileUploadHandler = () => {

  // base upload folder
  const baseUploadDir = path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir);
  }

  // create folder helper
  const createDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  // storage config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;

      switch (file.fieldname) {
        case 'image':
          uploadDir = path.join(baseUploadDir, 'images');
          break;

        case 'document':
          uploadDir = path.join(baseUploadDir, 'documents');
          break;

        default:
          return cb(
            new ApiError(StatusCodes.BAD_REQUEST, 'File field not supported'),
            ''
          );
      }

      createDir(uploadDir);
      cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);

      const fileName =
        file.originalname
          .replace(fileExt, '')
          .toLowerCase()
          .split(' ')
          .join('-') +
        '-' +
        Date.now();

      cb(null, fileName + fileExt);
    },
  });

  // file filter
  const fileFilter = (req: Request, file: any, cb: FileFilterCallback) => {
    console.log("📁 FILE RECEIVED:", file.fieldname);

    // IMAGE validation
    if (file.fieldname === 'image') {
      if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg'
      ) {
        cb(null, true);
      } else {
        cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only image files allowed'));
      }
    }

    // DOCUMENT validation
    else if (file.fieldname === 'document') {
      // allow pdf, doc, docx, etc
        const allowed = [
          // images
      "image/jpeg",
      "image/png",
      "image/jpg",
            "image/webp",
            // documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only PDF/DOC files allowed'));
      }
    }

    else {
      cb(new ApiError(StatusCodes.BAD_REQUEST, 'Unsupported file field'));
    }
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }).fields([
    { name: 'image', maxCount: 3 },
    { name: 'document', maxCount: 2 },
  ]);

  return upload;
};

export default fileUploadHandler;