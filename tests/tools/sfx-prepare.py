#!/usr/bin/env python3
"""Prepare the Speaking Lab sound library (Slice 12).

Usage:  python3 tests/tools/sfx-prepare.py DOWNLOADS_FOLDER [--check]

DOWNLOADS_FOLDER holds the takes you chose in ElevenLabs, renamed to the manifest ids (ui-click.mp3, badge-applied.wav,
...; any audio format ffmpeg reads). For each file this script:
  1. trims leading and trailing silence,
  2. shortens it to the manifest's longest allowed duration (with a 40 ms fade-out),
  3. normalizes loudness so every sound plays at the same level (EBU R128, -20 LUFS integrated) and limits peaks to -3 dB
     (very short clips are too short for an integrated loudness reading, so the limiter keeps them in line),
  4. writes a small mono 44.1 kHz 96 kbps MP3 to site/media/sfx/<id>.mp3,
  5. sets "present": true for that id in site/media/sfx/manifest.json (and records duration and size).
Files that are not in the manifest are ignored. Nothing is ever downloaded or generated.
--check only verifies that manifest.json matches the files in site/media/sfx/ (the tests do the same).
Needs ffmpeg and ffprobe."""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SFX = os.path.join(ROOT, "site", "media", "sfx")
MAN = os.path.join(SFX, "manifest.json")

def longest(rng):
    return float(re.split(r"[–-]", rng)[-1])

def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return float(out or 0)

def main():
    m = json.load(open(MAN, encoding="utf-8"))
    if "--check" in sys.argv:
        bad = [f["id"] for f in m["files"] if f["present"] != os.path.isfile(os.path.join(SFX, f["file"]))]
        print("manifest matches the files" if not bad else f"manifest does not match: {bad}")
        return 1 if bad else 0
    src = sys.argv[1]
    done = []
    for f in m["files"]:
        cand = [n for n in os.listdir(src) if os.path.splitext(n)[0] == f["id"]]
        if not cand:
            continue
        inp, out, cap = os.path.join(src, cand[0]), os.path.join(SFX, f["file"]), longest(f["duration"])
        af = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,"
              "areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,areverse,"
              f"atrim=0:{cap},afade=t=out:st={max(cap - 0.04, 0)}:d=0.04,loudnorm=I=-20:TP=-3:LRA=7,alimiter=limit=0.708:level=disabled")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", inp, "-af", af, "-ac", "1", "-ar", "44100", "-b:a", "96k", out], check=True)
        f["present"] = True
        f["seconds"] = round(probe(out), 2)
        f["bytes"] = os.path.getsize(out)
        done.append(f'{f["id"]}: {f["seconds"]} s, {f["bytes"] // 1024} KB')
    json.dump(m, open(MAN, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("\n".join(done) or "no matching files found")
    print("Next: listen to each file, then set \"reviewed\": true in manifest.json when you approve the library.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
