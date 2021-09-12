const udp = require("dgram");
const OPCODES = require("../Opcodes");
const socket = udp.createSocket("udp4");
const fs = require("fs");
const path = require("path");

socket.on("error", (err) => {
  console.log(err);
  socket.close();
});

socket.on("connect", (socket) => {
  console.log("someone connected %s", socket);
});

const waitForAck = ({ port, address }) =>
  new Promise((r, j) => {
    socket.on("message", (msg, rinfo) => {
      if (`${address}:${port}` !== `${rinfo.address}:${rinfo.port}`) {
        return;
      }
      msg = msg.toString();
      let [Opcode, ...req] = msg.split(" ");
      Opcode = OPCODES[Opcode];
      if (Opcode == 4) {
        r({ rinfo, block: req[0] });
      }
    });
  });

socket.on("message", (msg, { port, address }) => {
  msg = msg.toString();
  let [Opcode, ...req] = msg.split(" ");
  if (Opcode == 1) {
    Opcode = OPCODES[Opcode];
    const [filename, _, mode, __] = req;
    let file = fs.readFileSync(path.join(__dirname, filename));
    const LEN = 512;
    let data = [];
    while (file.length) {
      let i = file.lastIndexOf(32, LEN + 1);
      // If no space found, try forward search
      if (i < 0) i = file.indexOf(32, LEN);
      // If there's no space at all, take the whole string
      if (i < 0) i = file.length;
      // This is a safe cut-off point; never half-way a multi-byte
      data.push(file.slice(0, i));
      file = file.slice(i + 1); // Skip space (if any)
    }
    let block = 1;
    data.map(async (i) => {
      console.log(i.toString("utf-8"));
      socket.send(`3 ${block} ${i.toString()}`, port, address);
      const { block: ackBlock } = await waitForAck({ port, address });
      if (block != ackBlock) {
        return;
      }
      block++;
    });
  }
});

socket.on("listening", () => {
  const addr = socket.address();
  console.log("server is listening on %s:%j", addr.address, addr.port);
});

socket.bind(2006, "localhost");
