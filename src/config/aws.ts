import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

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

/**
 * Helper to extract S3 Key from full HTTP / CloudFront URL or raw key string.
 */
export const extractS3KeyFromUrl = (urlOrKey: string): string | null => {
  if (!urlOrKey) return null;
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return urlOrKey.replace(/^\//, '');
  }
  try {
    const parsed = new URL(urlOrKey);
    return parsed.pathname.replace(/^\//, '');
  } catch (err) {
    return null;
  }
};

/**
 * Deletes a single file from S3 bucket by URL or Key.
 */
export const deleteFileFromS3 = async (urlOrKey: string): Promise<void> => {
  try {
    const key = extractS3KeyFromUrl(urlOrKey);
    if (!key) return;

    await s3.send(
      new DeleteObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error(`[AWS S3 Delete File Error]: ${urlOrKey}`, error);
  }
};

/**
 * Deletes an entire folder (all objects under a prefix) from S3 bucket.
 * e.g. deleteFolderFromS3('videos/hls/${videoId}/')
 */
export const deleteFolderFromS3 = async (prefix: string): Promise<void> => {
  try {
    const cleanPrefix = prefix.replace(/^\//, '');
    const listCommand = new ListObjectsV2Command({
      Bucket: AWS_S3_BUCKET,
      Prefix: cleanPrefix,
    });

    const listResult = await s3.send(listCommand);
    if (!listResult.Contents || listResult.Contents.length === 0) {
      return;
    }

    const deleteParams = {
      Bucket: AWS_S3_BUCKET,
      Delete: {
        Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })),
      },
    };

    await s3.send(new DeleteObjectsCommand(deleteParams));
  } catch (error) {
    console.error(`[AWS S3 Delete Folder Error]: ${prefix}`, error);
  }
};