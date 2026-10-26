import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';

export const useSocket = () => {
  const token = useAuthStore((s) => s.token);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const { applyTaskMoved, applyTaskUpdated, applyTaskCreated, applyTaskDeleted } = useBoardStore();

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !activeWorkspace) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('⚡ Socket connected to workspace room:', activeWorkspace.name);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time collaborative board event listeners
    socket.on('task:moved', (data: { task: any }) => {
      console.log('🔄 Real-time event [task:moved]:', data);
      if (data?.task) {
        applyTaskMoved(data.task);
      }
    });

    socket.on('task:updated', (task: any) => {
      console.log('✏️ Real-time event [task:updated]:', task);
      applyTaskUpdated(task);
    });

    socket.on('task:created', (task: any) => {
      console.log('➕ Real-time event [task:created]:', task);
      applyTaskCreated(task);
    });

    socket.on('task:deleted', (data: { taskId: string }) => {
      console.log('🗑️ Real-time event [task:deleted]:', data);
      applyTaskDeleted(data.taskId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, activeWorkspace?._id]);

  return { isConnected, socket: socketRef.current };
};
