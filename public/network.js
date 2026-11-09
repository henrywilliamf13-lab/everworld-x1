
let socket = null;
let loading = null;

function loadSocketIO() {
  if (window.io) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.onload = resolve;
    script.onerror = () => reject(
      new Error("Multiplayer library failed to load")
    );
    document.head.appendChild(script);
  });

  return loading;
}

export async function connectToGame(name, mission) {
  await loadSocketIO();

  return new Promise((resolve, reject) => {
    socket = window.io();

    socket.on("connect", () => {
      socket.emit("player:join", { name, mission });
    });

    socket.on("player:ready", data => {
      resolve(data);
    });

    socket.on("player:joined", player => {
      window.dispatchEvent(
        new CustomEvent("ew:joined", { detail: player })
      );
    });

    socket.on("player:moved", player => {
      window.dispatchEvent(
        new CustomEvent("ew:moved", { detail: player })
      );
    });

    socket.on("player:left", player => {
      window.dispatchEvent(
        new CustomEvent("ew:left", { detail: player })
      );
    });

    socket.on("game:error", reject);
    socket.on("connect_error", reject);
  });
}

export function sendPosition(x, z, rotation) {
  if (socket?.connected) {
    socket.emit("player:move", { x, z, rotation });
  }
}

export function disconnectFromGame() {
  if (socket) {
    socket.emit("player:leave");
    socket.disconnect();
    socket = null;
  }
}
