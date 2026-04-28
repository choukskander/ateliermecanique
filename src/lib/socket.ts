import io from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;

export function getSocket(token?: string) {
  if (!socket) {
    const apiURL = import.meta.env.VITE_API_URL || "";
    socket = io(apiURL, {
      auth: token ? { token } : undefined,
    });
  } else if (token) {
    // update auth for next reconnects
    (socket as any).auth = { token };
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

