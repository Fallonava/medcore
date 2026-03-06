"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const useSocket = (room?: string) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect once per client session to avoid multiple connections
    if (!socket) {
      socket = io({
        path: '/socket.io',
        autoConnect: true,
      });
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If connected and room provided, join room (e.g., 'schedules', 'queue')
    if (socket.connected) {
      setIsConnected(true);
      if (room) socket.emit('join_room', room);
    } else {
      socket.connect();
    }

    return () => {
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      }
    };
  }, [room]);

  return { socket, isConnected };
};
