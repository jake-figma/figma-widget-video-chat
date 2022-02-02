const http = require("http");
const fs = require("fs").promises;

const server = http.createServer(async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  const html = await fs.readFile("index.html", "utf-8");
  res.end(html);
});

server.listen(42069);
