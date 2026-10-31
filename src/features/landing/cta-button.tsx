import { clsx } from 'clsx';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

const CTA_CLASS =
  'landing-cta-shine relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white font-semibold text-[#2b2e33] shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_10px_30px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_14px_40px_-6px_rgba(0,0,0,0.6)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60';

/** Tanitim sayfasina ozel, koyu zeminde beyaz "pill" birincil eylem dugmesi. */
export function CtaButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={clsx(CTA_CLASS, 'px-6 py-3 text-sm', className)} {...props} />;
}

export function CtaLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={clsx(CTA_CLASS, 'px-5 py-2.5 text-sm', className)} {...props} />;
}
