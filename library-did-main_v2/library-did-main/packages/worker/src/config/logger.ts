import winston from 'winston';
import { config } from './index';

const logLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/worker-error.log', level: 'error' })
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/worker-combined.log' })
  );
}
