#!/usr/bin/env python3
"""가구 PNG 배경 투명화.

일부 가구 PNG 는 배경이 불투명(흰색 등)하게 내보내져 방꾸미기/상점에서 네모 배경이
보인다. 이 스크립트는 각 PNG 의 가장자리에서 시작해 배경색과 유사한 픽셀을
연결된 영역(BFS flood fill)만 투명화한다. 가장자리에 연결되지 않은 내부 흰색
(예: 가구 표면의 하이라이트)은 보존된다.

사용법:
  python3 make-furniture-transparent.py --check        # 점검만 (변경 없음)
  python3 make-furniture-transparent.py --apply         # 적용 (원본은 .bak_orig/ 백업)

옵션:
  --tolerance N   배경색 허용 오차(0~255, 기본 24)
  --dir PATH      대상 디렉터리 (기본: ../public/furniture)
"""
import argparse
import os
import sys
from collections import deque

from PIL import Image

DEFAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "furniture")

# 의도적으로 불투명(전체 배경)인 에셋 — 투명화 대상에서 제외한다.
#   wallpaper_*  : RoomCanvas 배경을 통째로 교체하는 벽지
#   wall_* / floor_* : 방 기본 배경 레이어 (가구 아님, 상점 미노출)
EXCLUDE_PREFIXES = ("wallpaper_", "wall_", "floor_")


def transparent_ratio(img):
    if img.mode != "RGBA":
        return 0.0
    alpha = img.getchannel("A")
    hist = alpha.histogram()
    total = img.width * img.height
    return hist[0] / total if total else 0.0


def corner_is_opaque(img):
    """네 모서리가 모두 불투명하면 배경이 안 깎인 것으로 본다."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    return all(rgba.getpixel(c)[3] >= 250 for c in corners)


def flood_fill_transparent(img, tolerance):
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    # 배경색 = 네 모서리 색의 평균(불투명 모서리만)
    samples = [px[c] for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]
    opaque = [s for s in samples if s[3] >= 250]
    if not opaque:
        return rgba, 0
    bg = tuple(sum(s[i] for s in opaque) // len(opaque) for i in range(3))

    def matches(p):
        return (
            p[3] >= 250
            and abs(p[0] - bg[0]) <= tolerance
            and abs(p[1] - bg[1]) <= tolerance
            and abs(p[2] - bg[2]) <= tolerance
        )

    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))

    cleared = 0
    while q:
        x, y = q.popleft()
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        p = px[x, y]
        if not matches(p):
            continue
        px[x, y] = (p[0], p[1], p[2], 0)
        cleared += 1
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))

    return rgba, cleared


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--check", action="store_true")
    g.add_argument("--apply", action="store_true")
    ap.add_argument("--tolerance", type=int, default=24)
    ap.add_argument("--dir", default=DEFAULT_DIR)
    args = ap.parse_args()

    target_dir = os.path.abspath(args.dir)
    files = sorted(f for f in os.listdir(target_dir) if f.lower().endswith(".png"))
    if not files:
        print(f"PNG 없음: {target_dir}")
        return 1

    backup_dir = os.path.join(target_dir, ".bak_orig")
    if args.apply:
        os.makedirs(backup_dir, exist_ok=True)

    need = []
    for name in files:
        path = os.path.join(target_dir, name)
        img = Image.open(path)
        ratio = transparent_ratio(img.convert("RGBA"))
        opaque_corners = corner_is_opaque(img)
        excluded = name.startswith(EXCLUDE_PREFIXES)
        if opaque_corners and excluded:
            flag = "OPAQUE-BG(배경, 제외)"
        elif opaque_corners:
            flag = "OPAQUE-BG(수정대상)"
            need.append(name)
        else:
            flag = "ok"
        print(f"  {name:34s} transparent={ratio*100:5.1f}%  corners={flag}")

    print(f"\n총 {len(files)}개 중 배경 불투명 의심: {len(need)}개")

    if args.check:
        if need:
            print("→ 적용하려면: python3 make-furniture-transparent.py --apply")
        return 0

    # apply
    fixed = 0
    for name in need:
        path = os.path.join(target_dir, name)
        img = Image.open(path)
        # 백업
        img.save(os.path.join(backup_dir, name))
        out, cleared = flood_fill_transparent(img, args.tolerance)
        if cleared > 0:
            out.save(path)
            fixed += 1
            print(f"  ✓ {name}: {cleared}px 투명화")
        else:
            print(f"  - {name}: 변경 없음")
    print(f"\n완료: {fixed}개 파일 투명화 (원본 백업: {backup_dir})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
