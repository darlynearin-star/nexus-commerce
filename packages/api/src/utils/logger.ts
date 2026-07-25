export function logger(...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
}

logger.info = (...args: any[]) => logger('[INFO]', ...args);
logger.warn = (...args: any[]) => logger('[WARN]', ...args);
logger.error = (...args: any[]) => logger('[ERROR]', ...args);
logger.debug = (...args: any[]) => {
  if (process.env.DEBUG) logger('[DEBUG]', ...args);
};