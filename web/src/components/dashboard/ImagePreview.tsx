'use client';

import { useEffect, useState } from 'react';

export default function ImagePreview({ src }: { src: string }) {
  const [error, setError] = useState(false);

  useEffect(() => { setError(false); }, [src]);

  if (!src) return null;

  if (error) {
    return (
      <div className="mt-2 w-24 h-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
        Couldn&apos;t load image
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setError(true)}
      className="mt-2 w-24 h-24 object-cover rounded-md border border-gray-200"
    />
  );
}
