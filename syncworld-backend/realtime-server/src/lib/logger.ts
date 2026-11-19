import pino from 'pino';
import { realtimeServerEnv } from '../config/env';

const isProduction = realtimeServerEnv.NODE_ENV === 'production';

export const logger = pino({
  level: realtimeServerEnv.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
