import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  // Level via LOG_LEVEL env var (default: info in prod, debug in dev)
  level: config.logLevel ?? (config.node_env === 'production' ? 'info' : 'debug'),
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format: config.node_env === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), simple()),
    }),
  ],
});
