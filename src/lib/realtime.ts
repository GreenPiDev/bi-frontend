import { useEffect, useLayoutEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

let socket: Socket | null = null;

function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
}

/** Kimlik dogrulanmis oturum boyunca socket baglantisini acik tutar - tek noktadan
 * (bkz. ProtectedRoute) cagrilir, birden fazla bilesen ayni socket'i paylasir. */
export function useRealtimeConnection(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const client = getRealtimeSocket();
    client.connect();
    return () => {
      client.disconnect();
    };
  }, [enabled]);
}

/** Generic abonelik kancasi - ileride her yeni ozellik kendi event adiyla bunu cagirabilir.
 * `handler` her render'da yeniden olusan bir inline fonksiyon olabilir; ref uzerinden en
 * guncel halini tutup socket aboneligini sadece `event` degisince yeniden kuruyoruz. */
export function useRealtimeEvent<T>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const client = getRealtimeSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    client.on(event, listener);
    return () => {
      client.off(event, listener);
    };
  }, [event]);
}
