const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
});

const IMAGE_PROCESSING_QUEUE = 'image-processing';

const imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000, // keep last 1000 for observability, drop older
    removeOnFail: 5000,
  },
});

module.exports = { connection, imageProcessingQueue, IMAGE_PROCESSING_QUEUE };
