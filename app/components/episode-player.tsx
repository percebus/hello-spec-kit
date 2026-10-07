"use client";

import { useEffect, useState } from "react";

const sampleRate = 8_000;
const previewSeconds = 8;

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createPreviewUrl() {
  const sampleCount = sampleRate * previewSeconds;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(index / sampleRate, 1) * 0.12;
    const signal =
      Math.sin((2 * Math.PI * 220 * index) / sampleRate) +
      Math.sin((2 * Math.PI * 330 * index) / sampleRate) * 0.35;
    view.setInt16(44 + index * 2, signal * envelope * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export function EpisodePlayer({ title }: { title: string }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const url = createPreviewUrl();

    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <audio
      className="episode-player"
      aria-label={`Play ${title}`}
      controls
      preload="metadata"
      src={previewUrl}
    >
      Your browser does not support audio playback.
    </audio>
  );
}
