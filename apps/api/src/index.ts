export * from './server.js';

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  import('./server.js').then((m) => m.startServer());
}
