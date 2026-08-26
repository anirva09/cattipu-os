"""
Synthesize 5 short (<1s), subtle chiptune-style system sounds:
Boot, Window Open, Window Close, Success, Error.
Pure numpy + wave, no external audio deps.
"""
import numpy as np
import wave
import os

SR = 44100


def tone(freq, dur, vol=0.22, wave_shape="square", fade=0.008):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    if wave_shape == "square":
        y = np.sign(np.sin(2 * np.pi * freq * t))
    elif wave_shape == "sine":
        y = np.sin(2 * np.pi * freq * t)
    elif wave_shape == "tri":
        y = 2 * np.abs(2 * (t * freq - np.floor(t * freq + 0.5))) - 1
    else:
        y = np.sin(2 * np.pi * freq * t)
    y = y * vol
    # short fade in/out to avoid clicks
    n_fade = max(1, int(SR * fade))
    env = np.ones_like(y)
    env[:n_fade] = np.linspace(0, 1, n_fade)
    env[-n_fade:] = np.linspace(1, 0, n_fade)
    return y * env


def silence(dur):
    return np.zeros(int(SR * dur))


def save(path, chunks):
    y = np.concatenate(chunks)
    y = np.clip(y, -1, 1)
    pcm = (y * 32767).astype(np.int16)
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    print(path, f"{len(y) / SR:.2f}s")


os.makedirs("public/sounds", exist_ok=True)

# Boot: a short 3-note rising chiptune fanfare (~0.55s)
save("public/sounds/boot.wav", [
    tone(392.0, 0.09, vol=0.20, wave_shape="square"),
    silence(0.01),
    tone(523.25, 0.09, vol=0.20, wave_shape="square"),
    silence(0.01),
    tone(659.25, 0.16, vol=0.22, wave_shape="square"),
])

# Window Open: quick upward blip (~0.12s)
save("public/sounds/window-open.wav", [
    tone(440.0, 0.05, vol=0.16, wave_shape="tri"),
    tone(660.0, 0.07, vol=0.16, wave_shape="tri"),
])

# Window Close: quick downward blip (~0.12s)
save("public/sounds/window-close.wav", [
    tone(560.0, 0.05, vol=0.15, wave_shape="tri"),
    tone(360.0, 0.07, vol=0.15, wave_shape="tri"),
])

# Success: bright two-note major-third confirm (~0.2s)
save("public/sounds/success.wav", [
    tone(587.33, 0.08, vol=0.20, wave_shape="square"),
    tone(880.0, 0.14, vol=0.22, wave_shape="square"),
])

# Error: low two-note descending buzz (~0.22s)
save("public/sounds/error.wav", [
    tone(220.0, 0.10, vol=0.20, wave_shape="square"),
    tone(164.81, 0.16, vol=0.20, wave_shape="square"),
])
