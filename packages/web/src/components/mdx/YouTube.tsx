"use client";

import { useState } from "react";
import type { ReactElement } from "react";

interface YouTubeProps {
  id: string;
}

export function YouTube({ id }: YouTubeProps): ReactElement {
  const [playing, setPlaying] = useState(false);
  const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;

  if (playing) {
    return (
      <div className="w-full aspect-video my-4 rounded overflow-hidden">
        <iframe
          src={embedUrl}
          title="YouTube video"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video my-4 rounded overflow-hidden cursor-pointer group"
      onClick={() => setPlaying(true)}
      role="button"
      aria-label="Play YouTube video"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setPlaying(true);
      }}
    >
      <img
        src={thumbnail}
        alt="YouTube video thumbnail"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white ml-1" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
