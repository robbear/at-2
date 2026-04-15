import type { ReactElement } from "react";

type AspectRatio = "16:9" | "4:3" | "1:1";

const aspectClasses: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

interface IFrameProps {
  src: string;
  aspect?: AspectRatio;
}

export function IFrame({ src, aspect = "16:9" }: IFrameProps): ReactElement {
  return (
    <div className={`w-full ${aspectClasses[aspect] ?? "aspect-video"} my-4 rounded overflow-hidden`}>
      <iframe
        src={src}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Embedded content"
      />
    </div>
  );
}
