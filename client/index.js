const udp = require("dgram");
const fs = require("fs");
const socket = udp.createSocket("udp4");
const writer = fs.createWriteStream("./text1.txt");
socket.connect(2006, "localhost", () => {
  socket.send("1 text.txt 0 octet 0");
  console.log("connected");
  let file = [];
  socket.on("message", (msg) => {
    msg = msg.toString();
    const [Opcode, ...req] = msg.split(" ");
    const [block, data] = req;
    writer.write(data.toString("utf-8"));
    file.push(data);
    socket.send(`4 ${block}`);
    console.log(file, "\n");
  });
  socket.on("close", () => {
    console.log("connection closed");
  });
});
