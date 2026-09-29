import os from 'os';
import * as fs from 'fs';
import * as path from 'path';
const formatBytes = (bytes: number) => {
     return {
          bytes,
          GB: +(bytes / 1024 / 1024 / 1024).toFixed(2),
          MB: +(bytes / 1024 / 1024).toFixed(0),
     };
};

const formatUptime = (seconds: number) => {
     const days = Math.floor(seconds / 86400);
     seconds %= 86400;
     const hours = Math.floor(seconds / 3600);
     seconds %= 3600;
     const minutes = Math.floor(seconds / 60);
     return { days, hours, minutes };
};

import mongoose from 'mongoose';

const serverHealth = async () => {
     const totalMemory = os.totalmem();
     const freeMemory = os.freemem();
     const usedMemory = totalMemory - freeMemory;
     const usedMemoryPercentage = +((usedMemory / totalMemory) * 100).toFixed(2);

     const status =
          usedMemoryPercentage < 60 ? 'healthy' : usedMemoryPercentage < 85 ? 'moderate' : 'critical';

     return {
          status,
          database: {
               status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
               readyState: mongoose.connection.readyState,
          },
          cpuCores: os.cpus().length,
          loadAverage: {
               '1min': os.loadavg()[0],
               '5min': os.loadavg()[1],
               '15min': os.loadavg()[2],
          },
          memory: {
               totalMemory: formatBytes(totalMemory),
               freeMemory: formatBytes(freeMemory),
               usedMemory: formatBytes(usedMemory),
               usedMemoryPercentage,
          },
          uptime: formatUptime(os.uptime()),
          timestamp: new Date().toISOString(),
     };
};
const getServerLogsFromDB = async (query: Record<string, unknown>) => {
     const type = query.type === 'error' ? 'error' : 'success';
     const limit = Number(query.limit) || 100;
     const dirPath = path.join(process.cwd(), 'winston', type);

     if (!fs.existsSync(dirPath)) {
          return { logs: [] };
     }

     const files = fs
          .readdirSync(dirPath)
          .filter((file) => file.endsWith('.log'))
          .map((file) => ({
               name: file,
               path: path.join(dirPath, file),
               mtime: fs.statSync(path.join(dirPath, file)).mtime,
          }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

     if (files.length === 0) {
          return { logs: [] };
     }

     let logs: string[] = [];
     let chosenFile = files[0].name;

     for (const file of files) {
          try {
               const content = fs.readFileSync(file.path, 'utf-8');
               const lines = content.split('\n').filter(Boolean);
               if (lines.length > 0) {
                    logs = [...lines, ...logs];
                    chosenFile = file.name;
                    if (logs.length >= limit) {
                         logs = logs.slice(-limit);
                         break;
                    }
               }
          } catch (err) {
               // Ignore unreadable or locked log files
          }
     }

     return {
          fileName: chosenFile,
          logs,
     };
};
export const ServerHealthServices = {
     serverHealth,
     getServerLogsFromDB,
};
