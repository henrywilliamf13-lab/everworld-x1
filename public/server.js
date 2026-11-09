
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 20;

app.use(express.static("public"));

app.get("/api/status", (req, res) => {
  res.json({
    game: "EVERWORLD X1",
    status: "online",
    players: io.engine.clientsCount
  });
});

const players = new Map();

function cleanName(name) {
  return String(name || "Robot Player")
    .replace(/[<>]/g, "")
    .slice(0, 16);
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("player:join", (data = {}) => {
    if (players.has(socket.id)) return;

    const mission = ["city", "desert", "lab"].includes(data.mission)
      ? data.mission
      : "city";

    const room = "mission-" + mission;

    const roomCount = [...players.values()]
      .filter(p => p.room === room).length;

    if (roomCount >= MAX_PLAYERS) {
      socket.emit("game:error", "This mission is full.");
      return;
    }

    const player = {
      id: socket.id,
      name: cleanName(data.name),
      room,
      mission,
      x: Math.random() * 8 - 4,
      y: 0,
      z: 10,
      rotation: 0
    };

    players.set(socket.id, player);
    socket.join(room);

    socket.emit("player:ready", {
      id: socket.id,
      players: [...players.values()]
        .filter(p => p.room === room)
    });

    socket.to(room).emit("player:joined", player);

    console.log(player.name, "joined", room);
  });

  socket.on("player:move", (data = {}) => {
    const player = players.get(socket.id);
    if (!player) return;

    const x = Number(data.x);
    const z = Number(data.z);
    const rotation = Number(data.rotation);

    if (![x, z, rotation].every(Number.isFinite)) return;

    player.x = Math.max(-47, Math.min(47, x));
    player.z = Math.max(-47, Math.min(47, z));
    player.rotation = rotation;

    socket.to(player.room).emit("player:moved", {
      id: player.id,
      x: player.x,
      z: player.z,
      rotation: player.rotation
    });
  });

  socket.on("player:leave", () => {
    removePlayer(socket);
  });

  socket.on("disconnect", () => {
    removePlayer(socket);
    console.log("Player disconnected:", socket.id);
  });
});

function removePlayer(socket) {
  const player = players.get(socket.id);

  if (!player) return;

  socket.to(player.room).emit("player:left", {
    id: player.id
  });

  players.delete(socket.id);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------");
  console.log(" EVERWORLD X1 MULTIPLAYER");
  console.log("--------------------------------");
  console.log("Server running on port", PORT);
});
