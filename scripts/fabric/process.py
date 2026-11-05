#!/usr/bin/env python3
"""Offline, source-preserving studio-background matting and adaptive WebP export."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def probe(path):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ]))


def matte(rgb, previous=None):
    """Only border-connected near-neutral studio pixels; never key textile colors."""
    pixels = rgb.astype(np.float32)
    low, high = pixels.min(axis=2), pixels.max(axis=2)
    neutral = ((high - low < 30) & (low > 176)).astype(np.uint8)
    # Include a synthetic border so every exterior region is reachable in one flood.
    padded = np.pad(neutral, 1, constant_values=1)
    cv2.floodFill(padded, None, (0, 0), 2)
    exterior = padded[1:-1, 1:-1] == 2
    hard = (~exterior).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    # Compression speckles/shadows are not separate pieces of cloth. Keep significant islands.
    keep = np.zeros_like(hard)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] >= 40:
            keep[labels == label] = 1
    alpha = cv2.GaussianBlur(keep.astype(np.float32), (3, 3), 0.5)
    if previous is not None:
        old_gray, old_alpha = previous
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        # Backward flow warps the previous mask into this frame, avoiding trailing ghosts.
        flow = cv2.calcOpticalFlowFarneback(gray, old_gray, None, .5, 3, 15, 3, 5, 1.2, 0)
        yy, xx = np.mgrid[:alpha.shape[0], :alpha.shape[1]].astype(np.float32)
        warped = cv2.remap(old_alpha, xx + flow[..., 0], yy + flow[..., 1], cv2.INTER_LINEAR)
        uncertain = (alpha > .02) & (alpha < .98) & (np.abs(warped - alpha) < .22)
        alpha[uncertain] = .85 * alpha[uncertain] + .15 * warped[uncertain]
    # Propagate nearby interior textile colors into the one-pixel soft edge. This avoids
    # white matte contamination without desaturating cream yarn or colored embroidery.
    interior = alpha > .95
    feather = (alpha > 0) & ~interior
    if interior.any():
        _, nearest = cv2.distanceTransformWithLabels((~interior).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
        colors = pixels[interior]
        pixels[feather] = colors[np.clip(nearest[feather] - 1, 0, len(colors) - 1)]
    pixels[alpha == 0] = 0
    rgba = np.dstack([pixels.astype(np.uint8), np.rint(alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba), (cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), alpha)


def sample_indices(frames, count):
    """Allocate samples by image/mask change, with a floor for gentle awakening motion."""
    if len(frames) <= count:
        return list(range(len(frames)))
    thumbs = [np.asarray(im.resize((96, 54))).astype(np.float32) / 255 for _, im in frames]
    weights = [0.0] + [max(.025, float(np.abs(b - a).mean())) for a, b in zip(thumbs, thumbs[1:])]
    cumulative = np.cumsum(weights)
    selected = {0, len(frames) - 1}
    for target in np.linspace(0, cumulative[-1], count):
        selected.add(int(np.searchsorted(cumulative, target)))
    # Large motion spikes may duplicate indices: fill the longest unsampled interval.
    while len(selected) < count:
        ordered = sorted(selected)
        a, b = max(zip(ordered, ordered[1:]), key=lambda pair: pair[1] - pair[0])
        selected.add((a + b) // 2)
    return sorted(selected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--scroll-end", type=float, default=5.6)
    parser.add_argument("--portal-start", type=float, default=6.0)
    parser.add_argument("--portal-end", type=float, default=8.5)
    parser.add_argument("--width", type=int, default=960)
    parser.add_argument("--scroll-frames", type=int, default=30)
    parser.add_argument("--portal-frames", type=int, default=18)
    parser.add_argument("--quality", type=int, default=82)
    args = parser.parse_args()
    candidates = sorted((ROOT / "assets/source").glob("*.mp4"))
    source = (args.source or (candidates[0] if len(candidates) == 1 else ROOT / "assets/source/nasj-fabric-animation.mp4")).resolve()
    info = probe(source)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    duration = float(video.get("duration", info["format"]["duration"]))
    if not 0 < args.scroll_end <= args.portal_start < args.portal_end <= duration:
        raise ValueError("Cut points must satisfy 0 < scroll-end <= portal-start < portal-end <= video duration")
    # This method is intentionally specific to the inspected neutral-background footage.
    # Different footage must be inspected and supplied with a suitable matte; do not blindly reuse.
    if video["pix_fmt"] != "yuv420p":
        raise ValueError("Unreviewed source pixel format. Inspect alpha/background before changing the matte.")
    dest = ROOT / "public/fabric"
    previews = ROOT / "assets/previews"
    processed = ROOT / "assets/processed"
    dest.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(source))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames, previous = [], None
    index = 0
    # Dense analysis at source resolution / 12fps, independent of final adaptive sampling.
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        timestamp = index / fps
        index += 1
        if index % 2 == 0:
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        image, previous = matte(rgb, previous)
        if not frames:
            image.save(processed / "nasj-fabric-master.png")
        frames.append((timestamp, image))
    cap.release()
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    metadata = {
        "schemaVersion": 1, "source": {"path": str(source.relative_to(ROOT)), "sha256": source_hash, "bytes": source.stat().st_size,
        "duration": duration, "width": video["width"], "height": video["height"], "fps": fps, "codec": video["codec_name"], "pixelFormat": video["pix_fmt"], "hasAlpha": False},
        "method": "border-connected neutral studio matte; flow-aligned uncertain-edge smoothing; interior-color edge decontamination",
        "master": "assets/processed/nasj-fabric-master.png (lossless full-resolution matted still); original video retained byte-for-byte",
        "format": "transparent static WebP frames (RGBA canvas), no runtime video or audio",
        "cuts": {"awakenEnd": 1.5, "flightEnd": 3.5, "scrollEnd": args.scroll_end, "portalStart": args.portal_start, "portalEnd": args.portal_end},
        "sequences": {},
        "budgets": {"posterMobile": 60000, "scroll": 2400000, "portal": 1100000, "totalPublic": 4000000},
    }
    for name, start, end, width, count in [("scroll", 0, args.scroll_end, args.width, args.scroll_frames), ("portal", args.portal_start, args.portal_end, 640, args.portal_frames)]:
        group = [(time, im) for time, im in frames if start <= time <= end]
        selected = sample_indices(group, count)
        folder = dest / name
        folder.mkdir(exist_ok=True)
        emitted = []
        for i, chosen in enumerate(selected):
            time, im = group[chosen]
            path = folder / f"{i:03d}.webp"
            im.resize((width, round(width * video["height"] / video["width"])), Image.Resampling.LANCZOS).save(path, quality=args.quality, method=6)
            emitted.append({"src": f"/fabric/{name}/{path.name}", "time": round(time - start, 4), "bytes": path.stat().st_size})
        # Remove only obsolete generated frames; never source files.
        current = {Path(frame["src"]).name for frame in emitted}
        for old in folder.glob("*.webp"):
            if old.name not in current:
                old.unlink()
        metadata["sequences"][name] = {"width": width, "height": round(width * video["height"] / video["width"]), "duration": round(group[-1][0] - start, 4), "frames": emitted, "bytes": sum(f["bytes"] for f in emitted)}
    first = frames[0][1]
    for name, width in [("poster", 960), ("poster-mobile", 640)]:
        first.resize((width, round(width * 9 / 16)), Image.Resampling.LANCZOS).save(dest / f"{name}.webp", quality=86, method=6)
    portal_first = min(frames, key=lambda f: abs(f[0] - args.portal_start))[1]
    portal_first.resize((640, 360), Image.Resampling.LANCZOS).save(dest / "portal-poster.webp", quality=84, method=6)
    # Opaque textile close-up from the real final shot provides guaranteed portal coverage.
    closeup = min(frames, key=lambda f: abs(f[0] - args.portal_end))[1]
    center = closeup.crop((330, 245, 950, 565)).convert("RGB")
    center.save(dest / "cover.webp", quality=84, method=6)
    contact = Image.new("RGB", (1280, 6 * 220), "#103e30")
    draw = ImageDraw.Draw(contact)
    representative = [0, 1.5, 3.5, 5, 6.5, 8.5]
    for row, time in enumerate(representative):
        stamp, im = min(frames, key=lambda f: abs(f[0] - time))
        small = im.resize((640, 360), Image.Resampling.LANCZOS)
        for col, background in enumerate(["#103e30", "#f7f1e8"]):
            cell = Image.new("RGB", (640, 220), background)
            cell.paste(small, (0, -85), small)
            contact.paste(cell, (col * 640, row * 220))
        draw.text((12, row * 220 + 10), f"{stamp:.2f}s", fill="#e4bc7b")
        im.resize((640, 360), Image.Resampling.LANCZOS).save(previews / f"frame-{time:.1f}.webp", quality=85)
    contact.save(previews / "matte-contact.jpg", quality=90)
    metadata["stills"] = {p.name: p.stat().st_size for p in dest.glob("*.webp")}
    metadata["totalPublicBytes"] = sum(metadata["stills"].values()) + sum(s["bytes"] for s in metadata["sequences"].values())
    if metadata["totalPublicBytes"] > metadata["budgets"]["totalPublic"]:
        raise ValueError("Public assets exceed 4MB budget; reduce frames, resolution or quality")
    for name in ["scroll", "portal"]:
        if metadata["sequences"][name]["bytes"] > metadata["budgets"][name]:
            raise ValueError(f"{name} exceeds its transfer budget")
    if metadata["stills"]["poster-mobile.webp"] > metadata["budgets"]["posterMobile"]:
        raise ValueError("Mobile poster exceeds its transfer budget")
    (dest / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    (previews / "source-probe.json").write_text(json.dumps(info, indent=2) + "\n")
    print(json.dumps({"sourceSha256": source_hash, "bytes": metadata["totalPublicBytes"], "sequences": {k: {"frames": len(v["frames"]), "bytes": v["bytes"]} for k, v in metadata["sequences"].items()}}))


if __name__ == "__main__":
    main()
