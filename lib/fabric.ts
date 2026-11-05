export type FabricFrame = { src: string; time: number; bytes: number };
export type FabricSequenceData = { width: number; height: number; duration: number; frames: FabricFrame[]; bytes: number };
export type FabricManifest = { sequences: Record<"scroll" | "portal", FabricSequenceData> };

export function frameAt(sequence: FabricSequenceData, progress: number) {
  const time = Math.min(1, Math.max(0, progress)) * sequence.duration;
  let index = 0;
  for (let i = 1; i < sequence.frames.length; i++) {
    if (Math.abs(sequence.frames[i].time - time) < Math.abs(sequence.frames[index].time - time)) index = i;
  }
  return index;
}

export function canPlayFabric() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number });
  return !connection.connection?.saveData && !/^(slow-2g|2g)$/.test(connection.connection?.effectiveType || "")
    && (connection.deviceMemory === undefined || connection.deviceMemory >= 4)
    && navigator.hardwareConcurrency >= 4;
}

export async function loadFabric(kind: "scroll" | "portal", signal: AbortSignal) {
  const response = await fetch("/fabric/manifest.json", { signal });
  if (!response.ok) throw new Error("Fabric manifest unavailable");
  const manifest: FabricManifest = await response.json();
  const sequence = manifest.sequences[kind];
  const images: ImageBitmap[] = new Array(sequence.frames.length);
  let next = 0;
  async function worker() {
    while (next < sequence.frames.length && !signal.aborted) {
      const index = next++;
      const frame = await fetch(sequence.frames[index].src, { signal });
      if (!frame.ok) throw new Error("Fabric frame unavailable");
      const bitmap = await createImageBitmap(await frame.blob());
      if (signal.aborted) { bitmap.close(); break; }
      images[index] = bitmap;
    }
  }
  const results = await Promise.allSettled([worker(), worker(), worker()]);
  if (signal.aborted || results.some(result => result.status === "rejected")) {
    images.forEach(image => image?.close());
    throw new Error("Fabric loading stopped");
  }
  return { sequence, images, dispose: () => images.forEach(image => image.close()) };
}
