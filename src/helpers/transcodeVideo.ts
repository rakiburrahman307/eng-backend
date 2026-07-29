import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3, AWS_S3_BUCKET, getFileUrl } from '../config/aws';
import { Video } from '../app/modules/video/video.model';
import { logger, errorLogger } from '../shared/logger';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Downloads a remote HTTP/HTTPS file to a local destination path.
 */
const downloadFileHttp = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        return reject(new Error(`HTTP Download failed with status: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
};

/**
 * Transcodes a raw MP4 video into zero-buffer Web HLS format (.m3u8 + 2s .ts segments) using FFmpeg,
 * applies rate control (-crf 23, -maxrate 2500k), keyframe alignment (-g 48), YUV420p color space,
 * uploads all generated HLS segments with CDN Cache-Control headers to AWS S3, and updates Video DB record.
 */
export const transcodeVideoToHLS = async (videoId: string, inputVideoUrl: string) => {
  const tempDir = path.join(process.cwd(), 'temp_transcode', videoId);

  try {
    // 1. Update Video processing status to 'processing'
    await Video.findByIdAndUpdate(videoId, { processingStatus: 'processing' });
    logger.info(`[FFmpeg] Started Zero-Buffer HLS transcoding for video ID: ${videoId}`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 2. Obtain raw input file (download directly from S3 or HTTP URL)
    let rawInputPath = inputVideoUrl;

    if (inputVideoUrl.startsWith('http://') || inputVideoUrl.startsWith('https://')) {
      const localMp4Path = path.join(tempDir, 'raw_input.mp4');
      const urlObj = new URL(inputVideoUrl);
      const rawS3Key = urlObj.pathname.replace(/^\//, '');

      try {
        logger.info(`[FFmpeg] Attempting S3 GetObject for key: ${rawS3Key}`);
        const s3Response = await s3.send(new GetObjectCommand({
          Bucket: AWS_S3_BUCKET,
          Key: rawS3Key,
        }));
        const writeStream = fs.createWriteStream(localMp4Path);
        await pipeline(s3Response.Body as Readable, writeStream);
        logger.info(`[FFmpeg] Downloaded raw video via S3 SDK: ${localMp4Path}`);
      } catch (s3Err) {
        logger.warn(`[FFmpeg] S3 SDK download failed, falling back to HTTP download:`, s3Err);
        await downloadFileHttp(inputVideoUrl, localMp4Path);
        logger.info(`[FFmpeg] Downloaded raw video via HTTP: ${localMp4Path}`);
      }

      // Convert path to forward slashes for Windows compatibility in FFmpeg
      rawInputPath = localMp4Path.replace(/\\/g, '/');
    } else {
      rawInputPath = inputVideoUrl.replace(/\\/g, '/');
    }

    // FFmpeg requires forward slashes on Windows for output paths & patterns
    const outputPlaylist = path.join(tempDir, 'index.m3u8').replace(/\\/g, '/');
    const segmentPattern = path.join(tempDir, 'segment_%03d.ts').replace(/\\/g, '/');

    // 3. Transcode Video using ultra-optimized FFmpeg HLS settings
    await new Promise((resolve, reject) => {
      ffmpeg(rawInputPath)
        .outputOptions([
          '-preset veryfast',               // Optimized speed & high compression ratio
          '-g 48',                         // Keyframe interval every 2 seconds (assuming 24fps)
          '-keyint_min 24',
          '-sc_threshold 0',               // Prevent scene change keyframe misalignment
          '-hls_time 2',                   // 2 second segments for ultra-fast instant playback
          '-hls_playlist_type vod',
          '-hls_flags independent_segments', // Every segment is standalone (instant seeking & zero buffer)
          `-hls_segment_filename ${segmentPattern}`,
          '-movflags +faststart',          // Move MOOV atom to beginning
          '-crf 23',                       // Perceptual visual quality target
          '-maxrate 2500k',                // Max video bitrate (prevents network buffer spikes)
          '-bufsize 5000k',                // Rate control buffer size
          '-vf scale=\'min(1280,iw)\':-2',  // Auto cap resolution to max 720p/1080p for web
          '-pix_fmt yuv420p',              // Universal hardware acceleration across all devices
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .output(outputPlaylist)
        .on('start', (commandLine) => {
          logger.info(`[FFmpeg] Spawned command: ${commandLine}`);
        })
        .on('end', () => {
          logger.info(`[FFmpeg] Zero-buffer transcoding finished successfully for ${videoId}`);
          resolve(true);
        })
        .on('error', (err) => {
          errorLogger.error(`[FFmpeg] Transcoding error for ${videoId}:`, err);
          reject(err);
        })
        .run();
    });

    // 4. Upload generated HLS files (.m3u8 and .ts) to AWS S3 with CDN Caching headers
    const files = fs.readdirSync(tempDir).filter((file) => file !== 'raw_input.mp4');
    let hlsPlaylistUrl = '';

    for (const fileName of files) {
      const filePath = path.join(tempDir, fileName);
      const fileStream = fs.createReadStream(filePath);
      const s3Key = `videos/hls/${videoId}/${fileName}`;

      const isPlaylist = fileName.endsWith('.m3u8');
      const contentType = isPlaylist ? 'application/x-mpegURL' : 'video/MP2T';

      // Set aggressive CDN caching for .ts segments so CloudFront caches them forever at Edge locations
      const cacheControl = isPlaylist
        ? 'max-age=60'
        : 'public, max-age=31536000, immutable';

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: AWS_S3_BUCKET,
          Key: s3Key,
          Body: fileStream,
          ContentType: contentType,
          CacheControl: cacheControl,
        },
      });

      await upload.done();

      if (isPlaylist) {
        hlsPlaylistUrl = getFileUrl(s3Key);
      }
    }

    // 5. Update DB with HLS URL and mark as 'completed'
    await Video.findByIdAndUpdate(videoId, {
      hlsUrl: hlsPlaylistUrl,
      processingStatus: 'completed',
    });

    logger.info(`[FFmpeg] Optimized HLS video ready & DB updated for ${videoId}: ${hlsPlaylistUrl}`);

  } catch (error) {
    errorLogger.error(`[FFmpeg] Failed to process HLS for videoId: ${videoId}`, error);
    await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
  } finally {
    // 6. Cleanup temporary folder
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};
