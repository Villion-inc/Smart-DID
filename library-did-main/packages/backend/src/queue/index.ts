import { Queue } from 'bullmq';
import { config } from '../config';

export const videoQueue = new Queue('video-generation', {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});
