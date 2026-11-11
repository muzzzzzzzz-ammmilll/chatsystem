// Polyfill SlowBuffer for newer Node runtimes (Node 22+) where legacy SlowBuffer was removed
const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = function SlowBuffer() {};
  buffer.SlowBuffer.prototype = buffer.Buffer.prototype;
}

const { server, db } = require('./server');

const port = process.env.PORT || 8080;

(async () => {
  await db();
  server.listen(port, () => {
    console.log(`[${port}] server running...`);
  });
})();
