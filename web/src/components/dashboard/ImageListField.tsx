'use client';

import { useEffect, useRef, useState } from 'react';
import { RxArrowLeft, RxArrowRight, RxCross2 } from 'react-icons/rx';
import ImageUploadButton from '@/components/dashboard/ImageUploadButton';
import { thumbnailUrl } from '@/lib/upload';

const inputCls =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

/** An ordered list of images: upload several at once or paste links, then reorder or remove. */
export default function ImageListField({
  value,
  onChange,
  max = 12,
  onBusyChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const full = value.length >= max;

  // Several uploads finish one after another; each adds to the list as it is by then.
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const add = (url: string) => {
    if (latest.current.length >= max || latest.current.includes(url)) return;
    latest.current = [...latest.current, url];
    onChange(latest.current);
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setLinkError('Paste a full web link starting with https://');
      return;
    }
    add(url);
    setLink('');
    setLinkError(null);
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2" aria-label="Photos">
          {value.map((url, i) => (
            <li key={url} className="relative w-24 border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl(url)}
                alt={`Photo ${i + 1}`}
                className="w-24 h-24 object-cover"
                onError={e => { if (e.currentTarget.src !== url) e.currentTarget.src = url; }}
              />
              <div className="flex justify-between bg-white border-t border-gray-200">
                <button type="button" aria-label={`Move photo ${i + 1} left`} disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><RxArrowLeft size={12} /></button>
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(value.filter(u => u !== url))} className="p-1.5 text-gray-500 hover:text-red-600"><RxCross2 size={12} /></button>
                <button type="button" aria-label={`Move photo ${i + 1} right`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><RxArrowRight size={12} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <ImageUploadButton multiple disabled={full} onUploaded={add} onBusyChange={onBusyChange} />
        <div className="flex-1 min-w-[14rem] mt-1.5">
          <div className="flex gap-2">
            <input
              aria-label="Image link"
              className={`${inputCls} py-1 text-xs`}
              placeholder="…or paste an image link"
              value={link}
              disabled={full}
              onChange={e => { setLink(e.target.value); setLinkError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            />
            <button type="button" onClick={addLink} disabled={full || !link.trim()} className="text-xs border border-gray-200 rounded px-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Add
            </button>
          </div>
          {linkError && <p className="mt-1 text-xs text-red-600">{linkError}</p>}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {value.length} of {max} photos{full ? ' — remove one to add more' : ''}. Save the guideline to keep changes.
      </p>
    </div>
  );
}
