import { Upload } from "@aws-sdk/lib-storage";
import { s3, AWS_S3_BUCKET, getFileUrl } from "../config/aws";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
) => {
  const key = `${folder}/${Date.now()}-${file.originalname}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  await upload.done();

  return getFileUrl(key);
};