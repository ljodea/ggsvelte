"""Real-browser NVDA journeys using NV Access's upstream speech spy.

The only input synthesis in this file is Win32 ``SendInput``. DOM APIs and
Playwright are intentionally not used: the browser and application receive the
same public keyboard events as a user. Exact, unnormalised speech is written as
JSON Lines before assertions are applied.
"""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
from typing import Any

from robot.api import logger
from robot.libraries.BuiltIn import BuiltIn

import NvdaLib


_built_in = BuiltIn()
_browser_process: subprocess.Popen[bytes] | None = None
_browser_name = ""
_target_url = ""
_release = ""
_profile = "baseline"
_evidence_path: Path | None = None
_profile_path: Path | None = None
_sequence = 0
_original_high_contrast: tuple[int, str | None] | None = None

_VK = {
    "backspace": 0x08,
    "tab": 0x09,
    "enter": 0x0D,
    "shift": 0x10,
    "control": 0x11,
    "escape": 0x1B,
    "space": 0x20,
    "pageup": 0x21,
    "pagedown": 0x22,
    "end": 0x23,
    "home": 0x24,
    "left": 0x25,
    "up": 0x26,
    "right": 0x27,
    "down": 0x28,
    "insert": 0x2D,
    "f6": 0x75,
    "0": 0x30,
    "plus": 0xBB,
}

_SPI_GETHIGHCONTRAST = 0x0042
_SPI_SETHIGHCONTRAST = 0x0043
_HCF_HIGHCONTRASTON = 0x00000001
_SPIF_SENDCHANGE = 0x0002


class _KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t),
    ]


class _MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t),
    ]


class _HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]


class _INPUT_UNION(ctypes.Union):
    _fields_ = [("mi", _MOUSEINPUT), ("ki", _KEYBDINPUT), ("hi", _HARDWAREINPUT)]


class _INPUT(ctypes.Structure):
    _anonymous_ = ("value",)
    _fields_ = [("type", wintypes.DWORD), ("value", _INPUT_UNION)]


class _HIGHCONTRAST(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.UINT),
        ("dwFlags", wintypes.DWORD),
        ("lpszDefaultScheme", wintypes.LPWSTR),
    ]


def _send_key(key: str, modifiers: tuple[str, ...] = ()) -> None:
    """Send a physical key chord through the public Win32 input boundary."""

    keys = [*modifiers, key]
    events: list[_INPUT] = []
    for name in keys:
        events.append(_INPUT(type=1, ki=_KEYBDINPUT(_VK[name], 0, 0, 0, 0)))
    for name in reversed(keys):
        events.append(_INPUT(type=1, ki=_KEYBDINPUT(_VK[name], 0, 0x0002, 0, 0)))
    array = (_INPUT * len(events))(*events)
    sent = ctypes.windll.user32.SendInput(len(array), array, ctypes.sizeof(_INPUT))
    if sent != len(array):
        raise OSError(
            ctypes.get_last_error(), f"SendInput sent {sent}/{len(array)} events"
        )


def _spy() -> Any:
    return NvdaLib.getSpyLib()


def _speech_after_key(
    action: str,
    key: str,
    modifiers: tuple[str, ...] = (),
    require_speech: bool = True,
) -> str:
    spy = _spy()
    spy.wait_for_speech_to_finish()
    index = spy.get_next_speech_index()
    _send_key(key, modifiers)
    if require_speech:
        spy.wait_for_speech_to_finish(speechStartedIndex=index)
    else:
        time.sleep(1.0)
        spy.wait_for_speech_to_finish()
    speech = spy.get_speech_at_index_until_now(index)
    _record(action, speech, key=key, modifiers=list(modifiers))
    return speech


def _record(action: str, speech: str, **details: Any) -> None:
    global _sequence
    if _evidence_path is None:
        raise AssertionError("Evidence capture has not been started.")
    _sequence += 1
    value = {
        "sequence": _sequence,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "release": _release,
        "profile": _profile,
        "assistiveTechnology": "NVDA 2026.1.1",
        "browser": _browser_name,
        "target": _target_url,
        "action": action,
        "speech": speech,
        **details,
    }
    with _evidence_path.open("a", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False) + "\n")
    logger.info(json.dumps(value, ensure_ascii=False, indent=2))


def _assert_contains_once(speech: str, pattern: str, label: str) -> None:
    count = len(re.findall(pattern, speech, flags=re.IGNORECASE))
    if count != 1:
        raise AssertionError(
            f"{label} must occur once; found {count} in exact speech: {speech!r}"
        )


def _assert_contains(speech: str, pattern: str, label: str) -> None:
    if re.search(pattern, speech, flags=re.IGNORECASE) is None:
        raise AssertionError(f"{label} is missing from exact speech: {speech!r}")


def _browser_executable(browser: str) -> Path:
    candidates = {
        "chrome": [
            Path(os.environ.get("PROGRAMFILES", ""))
            / "Google/Chrome/Application/chrome.exe"
        ],
        "firefox": [
            Path(os.environ.get("PROGRAMFILES", "")) / "Mozilla Firefox/firefox.exe"
        ],
    }
    if browser not in candidates:
        raise AssertionError(f"Unsupported browser: {browser}")
    for candidate in candidates[browser]:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"Could not find headed {browser}: {candidates[browser]}")


def _fixture(path: str) -> str:
    return f"{_target_url.rstrip('/')}/{path.lstrip('/')}"


def _launch_browser(path: str, width: int = 1180, height: int = 760) -> None:
    global _browser_process, _profile_path
    close_browser()
    executable = _browser_executable(_browser_name)
    _profile_path = Path(tempfile.mkdtemp(prefix=f"ggsvelte-at-{_browser_name}-"))
    url = _fixture(path)
    if _browser_name == "chrome":
        args = [
            str(executable),
            f"--user-data-dir={_profile_path}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-features=Translate,PasswordManagerOnboarding",
            "--force-renderer-accessibility",
            f"--window-size={width},{height}",
            url,
        ]
    else:
        args = [
            str(executable),
            "-no-remote",
            "-profile",
            str(_profile_path),
            "-width",
            str(width),
            "-height",
            str(height),
            url,
        ]
    if _profile == "forced-colors":
        flags, scheme = _read_high_contrast()
        enabled = bool(flags & _HCF_HIGHCONTRASTON)
        _record(
            "verify Windows High Contrast before browser launch",
            "",
            enabled=enabled,
            flags=flags,
            scheme=scheme,
            url=url,
        )
        if not enabled:
            raise AssertionError("Windows High Contrast was off before browser launch.")
    _browser_process = subprocess.Popen(args)
    _focus_browser_window()
    _record("launch browser", "", url=url, viewport={"width": width, "height": height})
    if _profile == "browser-zoom-200":
        _set_browser_zoom_200()


def _focus_browser_window() -> None:
    deadline = time.monotonic() + 25
    user32 = ctypes.windll.user32
    match: int | None = None
    while time.monotonic() < deadline:
        windows: list[tuple[int, str]] = []

        @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        def collect(hwnd: int, _lparam: int) -> bool:
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length == 0:
                return True
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            windows.append((hwnd, buffer.value))
            return True

        user32.EnumWindows(collect, 0)
        expected = "chrome" if _browser_name == "chrome" else "firefox"
        for hwnd, title in windows:
            lower = title.lower()
            if "ggsvelte" in lower and expected in lower:
                match = hwnd
                break
        if match is not None:
            user32.ShowWindow(match, 9)
            user32.SetForegroundWindow(match)
            time.sleep(5)
            return
        time.sleep(0.5)
    raise AssertionError(f"The headed {_browser_name} ggsvelte window did not appear.")


def _tab_until(
    pattern: str, action: str, maximum: int = 30, reverse: bool = False
) -> str:
    for attempt in range(1, maximum + 1):
        speech = _speech_after_key(
            f"{action} (Tab {attempt})",
            "tab",
            ("shift",) if reverse else (),
        )
        if re.search(pattern, speech, flags=re.IGNORECASE):
            return speech
    raise AssertionError(
        f"Tab traversal never reached {pattern!r} after {maximum} steps."
    )


def _resize_foreground(width: int, height: int) -> None:
    user32 = ctypes.windll.user32
    hwnd = user32.GetForegroundWindow()
    if not hwnd or not user32.MoveWindow(hwnd, 40, 40, width, height, True):
        raise OSError(
            ctypes.get_last_error(), "Could not resize the headed browser window"
        )
    time.sleep(1)
    _record(
        "resize foreground browser", "", viewport={"width": width, "height": height}
    )


def _read_high_contrast() -> tuple[int, str | None]:
    value = _HIGHCONTRAST(cbSize=ctypes.sizeof(_HIGHCONTRAST))
    if not ctypes.windll.user32.SystemParametersInfoW(
        _SPI_GETHIGHCONTRAST, value.cbSize, ctypes.byref(value), 0
    ):
        raise OSError(ctypes.get_last_error(), "SPI_GETHIGHCONTRAST failed")
    return int(value.dwFlags), value.lpszDefaultScheme


def _write_high_contrast(flags: int, scheme: str | None) -> None:
    value = _HIGHCONTRAST(
        cbSize=ctypes.sizeof(_HIGHCONTRAST),
        dwFlags=flags,
        lpszDefaultScheme=scheme,
    )
    if not ctypes.windll.user32.SystemParametersInfoW(
        _SPI_SETHIGHCONTRAST,
        value.cbSize,
        ctypes.byref(value),
        _SPIF_SENDCHANGE,
    ):
        raise OSError(ctypes.get_last_error(), "SPI_SETHIGHCONTRAST failed")


def _enable_and_verify_high_contrast() -> None:
    global _original_high_contrast
    _original_high_contrast = _read_high_contrast()
    original_flags, scheme = _original_high_contrast
    _write_high_contrast(original_flags | _HCF_HIGHCONTRASTON, scheme)
    actual_flags, actual_scheme = _read_high_contrast()
    enabled = bool(actual_flags & _HCF_HIGHCONTRASTON)
    _record(
        "enable Windows High Contrast",
        "",
        systemParametersInfo="SPI_GETHIGHCONTRAST/SPI_SETHIGHCONTRAST",
        enabled=enabled,
        flags=actual_flags,
        scheme=actual_scheme,
    )
    if not enabled:
        raise AssertionError(
            "Windows High Contrast was not enabled before browser launch."
        )


def _restore_high_contrast() -> None:
    global _original_high_contrast
    if _original_high_contrast is None:
        return
    flags, scheme = _original_high_contrast
    _write_high_contrast(flags, scheme)
    actual_flags, actual_scheme = _read_high_contrast()
    restored = actual_flags == flags
    _record(
        "restore Windows High Contrast",
        "",
        restored=restored,
        enabled=bool(actual_flags & _HCF_HIGHCONTRASTON),
        flags=actual_flags,
        scheme=actual_scheme,
    )
    _original_high_contrast = None
    if not restored:
        raise AssertionError(
            "Windows High Contrast did not return to its original state."
        )


def _set_browser_zoom_200() -> None:
    _speech_after_key("reset browser zoom", "0", ("control",), require_speech=False)
    for attempt in range(1, 9):
        speech = _speech_after_key(
            f"increase browser zoom toward 200% ({attempt})", "plus", ("control",)
        )
        if re.search(r"\b200\s*(?:%|percent)\b", speech, flags=re.IGNORECASE):
            _record(
                "verify browser zoom",
                "",
                verifiedPercent=200,
                verification="NVDA exact speech from the browser zoom command",
            )
            return
    raise AssertionError(
        "The browser did not report a 200 percent zoom level through NVDA."
    )


def start_evidence(
    browser: str,
    target_url: str,
    evidence_dir: str,
    release: str,
    profile: str,
) -> None:
    global _browser_name, _target_url, _release, _profile, _evidence_path, _sequence
    _browser_name = browser.lower()
    _target_url = target_url
    _release = release
    _profile = profile.lower()
    if _profile not in {"baseline", "forced-colors", "browser-zoom-200"}:
        raise AssertionError(f"Unsupported display profile: {_profile}")
    directory = Path(evidence_dir)
    directory.mkdir(parents=True, exist_ok=True)
    _evidence_path = directory / "exact-speech.jsonl"
    _evidence_path.unlink(missing_ok=True)
    _sequence = 0
    _record(
        "begin evidence",
        "",
        platform="windows-2022",
        inputBoundary="Win32 SendInput",
        speechBoundary="nvaccess/nvda speechSpySynthDriver",
    )
    if _profile == "forced-colors":
        _enable_and_verify_high_contrast()


def finish_evidence() -> None:
    if _evidence_path is not None:
        if _profile == "forced-colors":
            _restore_high_contrast()
        _record("finish evidence", "")


def close_browser() -> None:
    global _browser_process, _profile_path
    if _browser_process is not None:
        _browser_process.terminate()
        try:
            _browser_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _browser_process.kill()
        _browser_process = None
    executable = "chrome.exe" if _browser_name == "chrome" else "firefox.exe"
    subprocess.run(
        ["taskkill", "/F", "/T", "/IM", executable], capture_output=True, check=False
    )
    if _profile_path is not None:
        shutil.rmtree(_profile_path, ignore_errors=True)
        _profile_path = None


def _find_grouped_value() -> str:
    for attempt in range(1, 30):
        speech = _speech_after_key(f"inspect next x group ({attempt})", "right")
        if re.search(r"\b2 data\b", speech, flags=re.IGNORECASE):
            _assert_contains_once(speech, r"\bx\s+193\b", "grouped x-axis value")
            _assert_contains_once(speech, r"\b2 data\b", "grouped member count")
            _assert_contains_once(speech, r"\bfocused\b", "focused group member")
            return speech
    raise AssertionError("Keyboard traversal never reached the two-member x=193 group.")


def run_inspection_journey() -> None:
    _launch_browser("examples/interactions/inspection")
    focused = _tab_until(
        r"Inspect a shared x value, then pin", "focus inspection surface"
    )
    _assert_contains(focused, r"arrow keys", "public keyboard instructions")
    _find_grouped_value()

    pinned = _speech_after_key("pin grouped value", "enter")
    _assert_contains_once(pinned, r"\bpinned\b", "pin state")
    _assert_contains_once(pinned, r"\b2 data\b", "pinned grouped member count")

    unpinned = _speech_after_key("unpin grouped value", "enter")
    _assert_contains_once(unpinned, r"\b2 data\b", "unpinned grouped member count")
    _assert_contains_once(unpinned, r"\bunpinned\b", "unpin state")

    _speech_after_key("dismiss inspection", "escape", require_speech=False)
    restored = _speech_after_key("confirm focus after dismiss", "right")
    _assert_contains(restored, r"\b(?:datum|data)\b", "restored inspection focus")

    _resize_foreground(460, 720)
    _find_grouped_value()
    docked = _speech_after_key("pin grouped value in docked tooltip", "enter")
    _assert_contains_once(docked, r"\bpinned\b", "docked tooltip pin state")
    # Browse mode exposes the complete ordinary-DOM definition list. Capture
    # several lines verbatim; automated DOM coverage separately proves that
    # no members are capped, while this is the real AT navigability evidence.
    _speech_after_key(
        "enter browse mode for docked tooltip",
        "space",
        ("insert",),
        require_speech=False,
    )
    for step in range(1, 13):
        _speech_after_key(f"navigate docked tooltip ordinary DOM ({step})", "down")


def _resize_area_with_keyboard() -> None:
    _speech_after_key("start area at keyboard anchor", "enter")
    for step in range(1, 5):
        _speech_after_key(
            f"grow area right ({step})", "right", ("shift",), require_speech=False
        )
        _speech_after_key(
            f"grow area down ({step})", "down", ("shift",), require_speech=False
        )


def run_interval_journey() -> None:
    _launch_browser("examples/interactions/interval-selection")
    _tab_until(r"Select area", "focus Select area")
    _speech_after_key("activate Select area", "enter", require_speech=False)
    _tab_until(r"Select an interval or brush to zoom", "focus interval surface")
    _resize_area_with_keyboard()
    selected = _speech_after_key("complete Select area", "enter")
    _assert_contains_once(selected, r"Selection complete", "selection completion")

    clear_focus = _tab_until(r"Clear selection", "reach Clear selection", reverse=True)
    _assert_contains(clear_focus, r"button", "Clear selection button role")
    cleared = _speech_after_key("activate Clear selection", "enter")
    _assert_contains_once(cleared, r"Selection cleared", "selection clear state")

    _launch_browser("examples/interactions/interval-selection")
    _tab_until(r"Zoom area", "focus Zoom area")
    _speech_after_key("activate Zoom area", "enter", require_speech=False)
    _tab_until(r"Select an interval or brush to zoom", "focus zoom surface")
    _resize_area_with_keyboard()
    zoomed = _speech_after_key("complete Zoom area", "enter")
    _assert_contains_once(zoomed, r"Zoom complete", "zoom completion")

    reset_focus = _tab_until(r"Reset zoom", "reach Reset zoom", reverse=True)
    _assert_contains(reset_focus, r"button", "Reset zoom button role")
    reset = _speech_after_key("activate Reset zoom", "enter")
    _assert_contains_once(reset, r"Zoom reset", "zoom reset state")
