import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, silentRefresh } from './api';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

let socket: Socket | null = null;

function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
}

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
/** Baglanti bu kadar sure ayakta kalirsa saglikli sayilir, geri cekilme sayaci sifirlanir
 * (connect -> hemen disconnect dongusunde sonsuz hizli deneme olmasin diye). */
const STABLE_CONNECTION_MS = 10_000;

/**
 * Kimlik dogrulanmis oturum boyunca socket baglantisini acik tutar - tek noktadan
 * (bkz. ProtectedRoute, PlatformAdminRoute) cagrilir, birden fazla bilesen ayni socket'i
 * paylasir.
 *
 * Neden elle yeniden baglanma: socket handshake'te access_token cookie'si (15 dk) dogrulanir.
 * Herhangi bir kopma (backend yeniden baslatma, ag kesintisi, uyku modu) sonrasi socket.io
 * kendi kendine yeniden baglanirken token suresi dolmussa sunucu baglantiyi reddeder
 * ("io server disconnect") ve socket.io bu durumda BIR DAHA DENEMEZ - sayfa yenilenene kadar
 * hicbir anlik olay gelmez. Burada once silentRefresh ile token yenilenip tekrar baglanilir;
 * yeniden baglaninca kopukken kacirilan olaylar icin aktif sorgular tazelenir.
 */
export function useRealtimeConnection(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const client = getRealtimeSocket();
    let stopped = false;
    let attempts = 0;
    let hasConnectedBefore = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect() {
      if (stopped || retryTimer) return;
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempts, RECONNECT_MAX_DELAY_MS);
      attempts += 1;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void silentRefresh().then((refreshed) => {
          // Refresh token da gecersizse oturum bitmistir; bir sonraki HTTP istegi login'e atar.
          if (!stopped && refreshed && !client.connected) client.connect();
        });
      }, delay);
    }

    function handleConnect() {
      clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        attempts = 0;
      }, STABLE_CONNECTION_MS);
      if (hasConnectedBefore) {
        void queryClient.invalidateQueries();
      }
      hasConnectedBefore = true;
    }

    function handleDisconnect(reason: Socket.DisconnectReason) {
      clearTimeout(stableTimer);
      // Sunucu reddettiyse socket.io kendisi denemez; diger nedenlerde kendi deniyor.
      if (reason === 'io server disconnect') scheduleReconnect();
    }

    function handleConnectError() {
      if (!client.active) scheduleReconnect();
    }

    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);
    client.on('connect_error', handleConnectError);
    client.connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(stableTimer);
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
      client.off('connect_error', handleConnectError);
      client.disconnect();
    };
  }, [enabled, queryClient]);
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
