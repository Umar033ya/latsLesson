"""Composes the music and prepares sound effects.

    pip install numpy scipy ; ffmpeg on PATH
    python game/tools/audio.py <folder with the unpacked CC0 packs>

Music, ambience and tonal effects are synthesised here (original).
Foley comes from CC0 packs, see public/assets/CREDITS.md.
"""
import glob
import os
import subprocess
import sys
import tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "audio")
SRC = sys.argv[1] if len(sys.argv) > 1 else None
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(47)
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    return 440 * 2 ** ((NOTE[name[:-1]] + (int(name[-1]) + 1) * 12 - 69) / 12)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    k = min(n, max(1, int(a * SR)))
    e[:k] *= np.linspace(0, 1, k)
    k = min(n, max(1, int(r * SR)))
    e[-k:] *= np.linspace(1, 0, k)
    return e


def filt(x, kind, f):
    return sosfilt(butter(2, np.array(f) / (SR / 2), kind, output="sos"), x)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def musicbox(f, sec=2.2):
    x = t(sec)
    return sum(a * np.sin(2 * np.pi * f * m * x) * np.exp(-x * d) for m, a, d in ((1, 1, 2.2), (2.0, 0.28, 4), (3.01, 0.22, 6), (5.4, 0.12, 12))) * env(len(x), 0.002, 0.05)


def piano(f, sec=3.0):
    x = t(sec)
    y = sum((0.9 / m ** 1.3) * np.sin(2 * np.pi * f * m * (1 + 0.0004 * m * m) * x) * np.exp(-x * (1.1 + 0.6 * m)) for m in range(1, 8))
    return y * env(len(x), 0.004, 0.2)


def pad(f, sec):
    x = t(sec)
    y = sum(np.sin(2 * np.pi * f * d * x + p) for d, p in ((1, 0), (1.004, 1), (0.996, 2), (2.002, 0.5)))
    return y * env(len(x), min(1.5, sec / 3), min(1.8, sec / 3)) / 4


def strings(f, sec):
    x = t(sec)
    v = 1 + 0.004 * np.sin(2 * np.pi * 5.3 * x)
    y = sum((1 / m) * np.sin(2 * np.pi * f * m * np.cumsum(v) / SR) for m in range(1, 9))
    return filt(y, "low", 2400) * env(len(x), 0.08, 0.15) * 0.5


def kick(f=52, sec=0.4):
    x = t(sec)
    return np.sin(2 * np.pi * (f * x + 22 * (1 - np.exp(-x * 28)))) * np.exp(-x * 9)


def put(buf, at, x, g=1.0):
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i : i + n] += x[:n] * g
    rest = len(x) - n
    if rest > 0:  # wrap the tail so loops are seamless
        m = min(rest, len(buf))
        buf[:m] += x[n : n + m] * g


def reverb(x, wet=0.35, decay=1.8):
    n = int(decay * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (5 / decay))
    ir = filt(ir, "low", 3800)
    size = len(x)
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(np.pad(ir, (0, max(0, size - n)))[:size], size), size)  # circular: keeps the loop seamless
    return x + wet * y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x))


def save(name, x, peak=0.8, q=4):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, "a.wav")
        wavfile.write(w, SR, (x * 32767).astype(np.int16))
        encode(w, name, [], q)


def encode(src, name, filters, q=4):
    af = ["-af", ",".join(filters)] if filters else []
    for ext, codec in (("ogg", ["-c:a", "libvorbis", "-q:a", str(q)]), ("m4a", ["-c:a", "aac", "-b:a", "96k"])):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), *af, *codec, os.path.join(OUT, f"{name}.{ext}")], check=True)


# ---------------------------------------------------------------- music
# One theme runs through everything: A minor, a child's round that never reaches its last note.
THEME = [("E5", 0), ("A5", 1), ("G5", 2), ("E5", 3), ("F5", 4), ("E5", 5), ("D5", 6), ("B4", 7), ("C5", 8), ("E5", 9), ("D5", 10), ("C5", 11), ("B4", 12), ("G#4", 14)]
CHORDS = [["A2", "E3", "C4"], ["F2", "C3", "A3"], ["D2", "A2", "F3"], ["E2", "B2", "G#3"]]


def title():
    beat, bars = 0.62, 32
    buf = np.zeros(int(beat * bars * SR))
    for rep in range(2):
        for n, b in THEME:
            put(buf, (b + rep * 16) * beat, musicbox(hz(n)), 0.5)
        for i, ch in enumerate(CHORDS):
            for k, n in enumerate(ch):
                put(buf, (i * 4 + rep * 16) * beat, pad(hz(n), beat * 4.4), 0.34)
                put(buf, (i * 4 + rep * 16 + 0.5 * k) * beat, piano(hz(n)), 0.32 if rep else 0.16)
    save("music_title", reverb(buf, 0.5, 2.4), 0.62)


def explore():
    sec = 40.0
    buf = np.zeros(int(sec * SR))
    for i, ch in enumerate([["A1", "E2", "B2"], ["F1", "C2", "G2"], ["D2", "A2", "E3"], ["E1", "B1", "F2"]]):
        for n in ch:
            put(buf, i * 10, pad(hz(n), 11.5), 0.4)
    for at, n in ((4, "E4"), (7.4, "C5"), (13, "A4"), (18.5, "G4"), (19.3, "E4"), (25, "D5"), (31, "B4"), (33.2, "G#4")):
        put(buf, at, piano(hz(n), 4), 0.13)
    air = filt(noise(sec), "band", [140, 520]) * (0.6 + 0.4 * np.sin(2 * np.pi * t(sec) / sec * 3))
    k = int(1.5 * SR)
    air[:k] = air[:k] * np.linspace(0, 1, k) + air[-k:] * np.linspace(1, 0, k)
    air[-k:] = air[-k:] * np.linspace(1, 0, k) + air[:k] * np.linspace(0, 1, k)
    put(buf, 0, air, 0.05)
    save("music_explore", reverb(buf, 0.45, 3), 0.55)


def tension():
    sec = 16.0
    x = t(sec)
    buf = np.zeros(int(sec * SR))
    for n, g in (("A1", 0.5), ("A#1", 0.28), ("E2", 0.2)):
        buf += np.sin(2 * np.pi * round(hz(n) * sec) / sec * x) * g * (0.7 + 0.3 * np.sin(2 * np.pi * x / 4))
    for i in range(16):
        put(buf, i, kick(44, 0.5), 0.55)
        put(buf, i + 0.28, kick(40, 0.45), 0.34)
    for i in range(0, 16, 4):
        put(buf, i + 2, strings(hz("A#3"), 1.9), 0.06)
        put(buf, i + 2, strings(hz("A3"), 1.9), 0.06)
    save("music_tension", reverb(buf, 0.25, 1.4), 0.6)


def chase():
    bpm = 148
    b = 60 / bpm
    buf = np.zeros(int(b * 32 * SR))
    hat = filt(noise(0.06), "high", 5000) * np.exp(-t(0.06) * 60)
    for i in range(32):
        put(buf, i * b, kick(58, 0.3), 0.9 if i % 4 in (0, 2) else 0.4)
        put(buf, (i + 0.5) * b, hat, 0.1)
        if i % 4 == 3:
            put(buf, (i + 0.5) * b, kick(70, 0.2), 0.5)
    for bar, root in enumerate(("A2", "A2", "F2", "E2", "A2", "C3", "F2", "E2")):
        for k in range(8):
            put(buf, (bar * 4 + k * 0.5) * b, strings(hz(root) * (1 if k % 2 else 2), b * 0.42), 0.32)
        put(buf, bar * 4 * b, pad(hz(root) / 2, b * 4), 0.5)
    for n, at in (("E5", 0), ("F5", 1.5), ("E5", 3), ("C5", 6), ("B4", 8), ("A4", 10), ("G#4", 12), ("B4", 14), ("E5", 16), ("A5", 18), ("G5", 20), ("E5", 22), ("F5", 24), ("E5", 26), ("D5", 28), ("G#4", 30)):
        put(buf, at * b, strings(hz(n), b * 1.4), 0.2)
    save("music_chase", reverb(buf, 0.16, 0.9), 0.68)


def ending():
    beat = 0.7
    buf = np.zeros(int(beat * 34 * SR))
    tune = THEME[:-1] + [("B4", 13), ("C5", 14), ("E5", 16), ("A5", 17), ("B5", 18), ("C6", 19), ("B5", 20), ("A5", 21), ("G5", 22), ("E5", 23), ("F5", 24), ("A5", 25), ("G5", 26), ("B5", 27), ("C6", 28)]
    for n, b in tune:
        put(buf, b * beat, musicbox(hz(n), 3), 0.42)
        put(buf, b * beat, piano(hz(n) / 2, 3), 0.3)
    for i, ch in enumerate([["A2", "E3", "C4"], ["F2", "C3", "A3"], ["D2", "A2", "F3"], ["G2", "D3", "B3"], ["C3", "G3", "E4"], ["G2", "D3", "B3"], ["F2", "C3", "A3"], ["C3", "G3", "E4"]]):
        for n in ch:
            put(buf, i * 4 * beat, pad(hz(n), beat * 4.6), 0.4)
    save("music_ending", reverb(buf, 0.5, 2.6), 0.66)


# ---------------------------------------------------------------- tonal effects
def effects():
    x = t(0.05)
    for i, f in enumerate((420, 470, 392)):
        save(f"blip_{i}", np.sign(np.sin(2 * np.pi * f * x)) * np.exp(-x * 60) * 0.4 + np.sin(2 * np.pi * f * x) * np.exp(-x * 50), 0.28)
    x = t(0.06)
    save("blip_voice", filt(np.sign(np.sin(2 * np.pi * 300 * x)) + 0.5 * noise(0.06), "band", [500, 2600]) * np.exp(-x * 40), 0.3)
    buf = np.zeros(int(1.5 * SR))
    for i, n in enumerate(("A4", "C5", "E5", "A5")):
        put(buf, i * 0.09, musicbox(hz(n), 1.1), 0.5)
    save("correct", buf, 0.6)
    x = t(0.9)
    scr = filt(noise(0.9), "band", [2400, 5200]) * (0.5 + 0.5 * np.sin(2 * np.pi * 34 * x)) * env(len(x), 0.05, 0.4) * 0.22
    low = np.sin(2 * np.pi * 98 * x) * np.exp(-x * 4) + 0.6 * np.sin(2 * np.pi * 104 * x) * np.exp(-x * 4)
    save("wrong", scr + low, 0.55)
    x = t(1.4)
    save("noticed", (strings(hz("A#4"), 1.4) + strings(hz("B4"), 1.4) + strings(hz("E5"), 1.4)) * np.exp(-x * 1.6) + kick(40, 1.4) * 1.4, 0.6)
    x = t(0.9)
    buf = np.zeros(int(0.9 * SR))
    put(buf, 0, kick(46, 0.35), 1)
    put(buf, 0.24, kick(42, 0.35), 0.7)
    save("heart", filt(buf, "low", 160), 0.8)
    sec = 2.4  # pen on paper: the Invigilator is always writing
    buf = np.zeros(int(sec * SR))
    at = 0.05
    while at < sec - 0.25:
        d = rng.uniform(0.05, 0.2)
        put(buf, at, filt(noise(d), "band", [1800, 4200]) * env(int(d * SR), 0.01, 0.04), rng.uniform(0.3, 1))
        at += d + rng.uniform(0.02, 0.14)
    save("pen", buf, 0.4)
    sec = 8.0
    x = t(sec)
    hum = sum(np.sin(2 * np.pi * f * x) * g for f, g in ((50, 0.5), (100, 0.4), (150, 0.2), (200, 0.12))) + filt(noise(sec), "band", [90, 300]) * 0.1
    save("hum", hum, 0.3)
    x = t(0.5)
    save("static", filt(noise(0.5), "band", [900, 4200]) * env(len(x), 0.02, 0.2), 0.22)
    x = t(0.7)
    save("power_down", np.sin(2 * np.pi * np.cumsum(220 * np.exp(-x * 4)) / SR) * env(len(x), 0.01, 0.3), 0.5)
    sec = 1.8
    x = t(sec)
    save("power_up", np.sin(2 * np.pi * np.cumsum(40 + 120 * np.minimum(1, x / 1.2)) / SR) * env(len(x), 0.4, 0.5) + filt(noise(sec), "band", [80, 240]) * 0.3 * env(len(x), 0.4, 0.5), 0.55)
    sec = 6.0  # the school bell, real and full
    x = t(sec)
    b = sum(a * np.sin(2 * np.pi * 392 * m * x) * np.exp(-x * d) for m, a, d in ((0.5, 0.6, 0.6), (1, 1, 0.8), (1.19, 0.6, 1.2), (1.5, 0.4, 1.6), (2, 0.5, 2), (2.74, 0.35, 3), (3.76, 0.2, 5)))
    buf = np.zeros(int(9 * SR))
    for i in range(3):
        put(buf, i * 1.5, b, 0.8)
    save("bell", reverb(buf, 0.35, 2.5), 0.75)
    x = t(0.16)
    save("tick", filt(noise(0.16), "band", [1500, 6000]) * np.exp(-x * 90) + 0.4 * np.sin(2 * np.pi * 900 * x) * np.exp(-x * 80), 0.35)
    x = t(0.5)
    save("battery_low", np.sin(2 * np.pi * 180 * x) * (np.sin(2 * np.pi * 9 * x) > 0) * np.exp(-x * 3), 0.25)


# ---------------------------------------------------------------- CC0 foley
def foley():
    def find(n):
        hits = glob.glob(os.path.join(SRC, "**", n), recursive=True)
        if not hits:
            raise SystemExit(f"missing {n} in {SRC}")
        return hits[0]

    trim = "silenceremove=start_periods=1:start_threshold=-50dB"
    for i, n in enumerate(("footstep00.ogg", "footstep02.ogg", "footstep04.ogg", "footstep06.ogg")):
        encode(find(n), f"step_{i}", [trim, "volume=0.7"], 3)
    for name, src, f in (
        ("door_open", "doorOpen_1.ogg", []), ("door_close", "doorClose_2.ogg", []), ("creak", "creak2.ogg", ["volume=0.8"]), ("locked", "metalLatch.ogg", ["volume=1.2"]),
        ("pickup", "handleSmallLeather.ogg", ["volume=1.6"]), ("keys", "keys_03.ogg", []), ("paper", "bookFlip2.ogg", []), ("book", "bookPlace1.ogg", []),
        ("locker", "metal_open_01.ogg", ["volume=0.6"]), ("locker_close", "metal_close_01.ogg", ["volume=0.6"]), ("switch", "switch_01.ogg", []), ("type", "metalClick.ogg", ["volume=1.2"]),
        ("wood", "wood_hit_02.ogg", []), ("slam", "slam_02.ogg", ["volume=0.8"]), ("chalk_hit", "tools_03.ogg", ["volume=0.5"]), ("spark", "noise_01.ogg", ["atrim=0:0.6", "volume=0.6"]), ("cloth", "cloth2.ogg", ["volume=1.3"]),
    ):
        encode(find(name if False else src), name, [trim, *f], 3)
    encode(find("rain-thunder.ogg"), "thunder", ["atrim=4:16", "asetpts=PTS-STARTPTS", "afade=t=in:d=0.6", "afade=t=out:st=9:d=3", "volume=0.8"], 3)
    encode(find("rainwin.mp3"), "rain", ["lowpass=f=5200", "volume=0.8"], 3)


title(); explore(); tension(); chase(); ending(); effects()
if SRC:
    foley()
print(sorted(os.listdir(OUT)))
