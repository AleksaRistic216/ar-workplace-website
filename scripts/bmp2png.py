#!/usr/bin/env python3
"""Convert the BMP that `cpt --screenshot` writes into a PNG.

The screenshot harness in the CPT repo shells out to ImageMagick for this. This exists so the
website's own capture flow (scripts/capture-product.sh) does not need ImageMagick installed —
the point of that flow is to be runnable on any machine that can build CPT, including one that
only has a Python 3 stdlib.

Handles 24- and 32-bit uncompressed BMPs, top-down or bottom-up, with any DIB header size
(the pixel offset is read from the file header rather than assumed).
"""

import struct
import sys
import zlib


def bmp_to_rgb(data: bytes):
    if data[:2] != b"BM":
        raise SystemExit("not a BMP file")

    pixel_offset = struct.unpack_from("<I", data, 10)[0]
    dib_size = struct.unpack_from("<I", data, 14)[0]
    if dib_size < 40:
        raise SystemExit(f"unsupported DIB header size {dib_size}")

    width, height = struct.unpack_from("<ii", data, 18)
    bpp = struct.unpack_from("<H", data, 28)[0]
    compression = struct.unpack_from("<I", data, 30)[0]

    if compression not in (0, 3):  # BI_RGB, BI_BITFIELDS
        raise SystemExit(f"unsupported BMP compression {compression}")
    if bpp not in (24, 32):
        raise SystemExit(f"unsupported bit depth {bpp}")

    top_down = height < 0
    height = abs(height)
    stride = ((width * bpp // 8) + 3) & ~3
    step = bpp // 8

    rows = []
    for y in range(height):
        src = y if top_down else height - 1 - y
        start = pixel_offset + src * stride
        row = bytearray()
        for x in range(width):
            b, g, r = data[start + x * step: start + x * step + 3]
            row += bytes((r, g, b))
        rows.append(bytes(row))
    return width, height, rows


def write_png(path: str, width: int, height: int, rows) -> None:
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (struct.pack(">I", len(payload)) + tag + payload
                + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: bmp2png.py <in.bmp> <out.png>")
    with open(sys.argv[1], "rb") as fh:
        data = fh.read()
    width, height, rows = bmp_to_rgb(data)
    write_png(sys.argv[2], width, height, rows)
    print(f"{sys.argv[2]}  {width}x{height}")


if __name__ == "__main__":
    main()
