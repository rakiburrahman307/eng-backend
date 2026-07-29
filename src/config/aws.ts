import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET!;

/**
 * Returns the public URL for a file stored in S3.
 * Uses CloudFront CDN URL (process.env.CLOUDFRONT_URL or AWS_CLOUDFRONT_URL) if configured,
 * otherwise falls back to direct S3 URL.
 */
export const getFileUrl = (key: string): string => {
  const cdnUrl = process.env.CLOUDFRONT_URL || process.env.AWS_CLOUDFRONT_URL;
  const cleanKey = key.replace(/^\//, '');

  if (cdnUrl) {
    const cleanCdn = cdnUrl.replace(/\/$/, '');
    return `${cleanCdn}/${cleanKey}`;
  }

  return `https://${AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${cleanKey}`;
};