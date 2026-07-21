import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "../config/aws";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
) => {
  const key = `${folder}/${Date.now()}-${file.originalname}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  await upload.done();

  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};