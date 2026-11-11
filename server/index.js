const { server, db } = require('./server');

const port = process.env.PORT || 8080;

(async () => {
  await db();
  server.listen(port, () => {
    console.log(`[${port}] server running...`);
  });
})();
