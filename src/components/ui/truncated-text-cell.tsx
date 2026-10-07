import { clsx } from 'clsx';
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Table hucrelerinde uzun metinleri (not/aciklama) kisaltip, tiklaninca caller'in
 * kendi modalini acmasini saglayan ortak hucre. Icerik modali (ne gosterilecegi)
 * caller'a ait - bu bilesen sadece kisaltma/tiklama davranisini merkezilestirir.
 *
 * Kisaltma sabit bir karakter sayisina gore degil, hucrenin fiilen kapladigi
 * genislige gore yapilir (ResizeObserver ile olculur) - 13" laptop ile 24"
 * monitorde ayni metin farkli uzunlukta kesilir, pencere/ekran boyutu
 * degistiginde yeniden olculur.
 */
export function TruncatedTextCell({
  text,
  onOpen,
}: {
  text: string | null | undefined;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const checkTruncation = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    checkTruncation();
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  if (!text) return <>—</>;

  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        if (!isTruncated) return;
        event.stopPropagation();
        onOpen();
      }}
      className={clsx(
        'block w-full truncate text-left',
        isTruncated
          ? 'cursor-pointer text-app-text hover:text-blue-600'
          : 'cursor-default text-app-text',
      )}
    >
      {text}
    </button>
  );
}
