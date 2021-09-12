const udp = require("dgram");
const OPCODES = require("../Opcodes");
const socket = udp.createSocket("udp4");
const fs = require("fs");
const path = require("path");

// class HandlePacket {
//   constructor(rinfo, socket, req) {
//     this.req = req;
//     this.socket = socket;
//     this.rinfo = rinfo;
//     this.block = 1;
//     this._data = [];
//   }
//   read() {
//     const [filename, _, mode, __] = this.req;
//     const data = fs.readFileSync(path.join(__dirname, filename));
//     this.division(data);
//     console.log(this._data);
//     this.send(this._data[0]);
//   }
//   write() {}
//   data() {}
//   ack() {
//     console.log(this._data);
//     const [block] = this.req;
//     if (block != this.block) {
//       return;
//     }
//     this.block += 1;
//     if (this.block > this._data.length) {
//       console.log("reading file finished");
//     }
//     this.send(this._data[this.block - 1]);
//   }
//   error() {}
//   send(data) {
//     this.socket.send(
//       `3 ${this.block} ${data}`,
//       this.rinfo.port,
//       this.rinfo.address
//     );
//   }
//   division(file) {
//     const LEN = 512;
//     while (file.length) {
//       let i = file.lastIndexOf(32, LEN + 1);
//       // If no space found, try forward search
//       if (i < 0) i = file.indexOf(32, LEN);
//       // If there's no space at all, take the whole string
//       if (i < 0) i = file.length;
//       // This is a safe cut-off point; never half-way a multi-byte
//       this._data.push(file.slice(0, i));
//       file = file.slice(i + 1); // Skip space (if any)    }
//     }
//   }
// }

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
