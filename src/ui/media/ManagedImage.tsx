'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getMedia, mediaIdFromRef } from '@/lib/media-repository';

export function ManagedImage({ src, alt, fill = false, className, sizes }: { src: string; alt: string; fill?: boolean; className?: string; sizes?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const ref = mediaIdFromRef(src);
  useEffect(() => { if (!ref) return; let active = true; let objectUrl = ''; getMedia(ref).then((media) => { if (!active) return; objectUrl = media ? URL.createObjectURL(media.blob) : ''; setUrl(objectUrl || null); }).catch(() => setUrl(null)); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [ref]);
  if (ref) return url ? <Image src={url} alt={alt} fill={fill} unoptimized sizes={sizes} className={className} /> : <span aria-label={`${alt} unavailable`} className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-50" />;
  // This same-origin route verifies published-media access and streams the
  // private object server-side. Bypass image optimization so it remains the
  // only browser-visible media URL.
  return <Image src={src} alt={alt} fill={fill} sizes={sizes} unoptimized={src.startsWith('/api/media/')} className={className} />;
}

export function ManagedDownload({ mediaId, label }: { mediaId: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const remoteUrl = mediaId.startsWith('/api/media/') ? mediaId : null;
  useEffect(() => {
    if (remoteUrl) return;
    let active = true;
    let objectUrl = '';
    getMedia(mediaId).then((media) => {
      if (!active || !media) return;
      objectUrl = URL.createObjectURL(media.blob);
      setUrl(objectUrl);
    }).catch(() => setUrl(null));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaId, remoteUrl]);
  if (remoteUrl) return <a href={remoteUrl} className="inline-flex min-h-10 items-center rounded-lg border border-purple-200 bg-purple-50 px-3 text-sm font-bold text-purple-700 hover:bg-purple-100">{label}</a>;
  return url ? <a href={url} download={label} className="inline-flex min-h-10 items-center rounded-lg border border-purple-200 bg-purple-50 px-3 text-sm font-bold text-purple-700 hover:bg-purple-100">{label}</a> : <span className="text-sm text-slate-500">{label} unavailable in this browser</span>;
}
