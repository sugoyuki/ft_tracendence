import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectionAttempted = false;
const listeners: Record<string, Function[]> = {};

(function initializeSocket() {
  const token = localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth") || "{}").token : null;

  if (token) {
    createSocketConnection(token);
  }
})();

export function createSocketConnection(token: string | null) {
  if (!token) return null;

  if (connectionAttempted && socket && socket.connected) {
    console.log("Socket connection already exists");
    return socket;
  }

  connectionAttempted = true;

  if (socket && socket.connected) {
    socket.disconnect();
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://localhost:8001";
  console.log(`Connecting to socket at: ${backendUrl}`);

  socket = io(backendUrl, {
    auth: {
      token,
      userId: getUserIdFromToken(token),
    },
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  return socket;
}

export function getSocketInstance() {
  return socket;
}

export function closeSocketConnection() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function on(event: string, callback: Function) {
  if (!listeners[event]) {
    listeners[event] = [];
  }

  listeners[event].push(callback);

  if (socket) {
    socket.on(event, (...args) => {
      callback(...args);
    });
  }

  return () => {
    if (listeners[event]) {
      const index = listeners[event].indexOf(callback);
      if (index !== -1) {
        listeners[event].splice(index, 1);
      }
    }
  };
}

export function emit(event: string, ...args: any[]) {
  if (socket) {
    socket.emit(event, ...args);
  } else {
    console.error("Cannot emit event: Socket not connected");
  }
}

export function joinRoom(roomType: string, roomId: string) {
  if (!socket) {
    console.error("Cannot join room: Socket not connected");
    return;
  }

  const roomIdentifier = `${roomType}:${roomId}`;
  socket.emit(`${roomType}:join`, { roomId });
  console.log(`Joining room: ${roomIdentifier}`);
}

function getUserIdFromToken(token: string): number | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    return payload.id || null;
  } catch (error) {
    console.error("Error extracting user ID from token:", error);
    return null;
  }
}
