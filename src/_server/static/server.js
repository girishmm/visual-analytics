import express from "express";
import ip from "ip";
import { Server } from "socket.io";
import { configs } from "./configs.js";
import { initWebSocket } from "../websocket.js";
import * as http from "http"

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
  },
})

app.use(express.static("public"))

initWebSocket(io);

server.listen(configs.port, () => {
  console.log("listening on *:" + configs.port)
})
