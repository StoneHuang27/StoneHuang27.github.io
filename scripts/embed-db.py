#!/usr/bin/env python3
"""
Compress food_db.json and embed it into index.html.

Usage:
    python scripts/embed-db.py

Steps:
  1. Read food_db.json
  2. Gzip compress it
  3. Base64 encode the compressed data
  4. Insert a <script> block into index.html with the embedded data
"""

import gzip
import base64
import json
import re

INPUT_FILE = "food_db.json"
INDEX_FILE = "index.html"

def main():
    # Read original data
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_json = f.read()

    original_size = len(raw_json.encode("utf-8"))
    data = json.loads(raw_json)
    print(f"  Items: {len(data)}")
    print(f"  Original size: {original_size:,} bytes")

    # Compress
    print("Compressing with gzip...")
    compressed = gzip.compress(raw_json.encode("utf-8"))
    compressed_size = len(compressed)
    print(f"  Compressed size: {compressed_size:,} bytes ({compressed_size/original_size*100:.1f}%)")

    # Base64 encode
    print("Encoding as Base64...")
    encoded = base64.b64encode(compressed).decode("ascii")
    b64_size = len(encoded)
    print(f"  Base64 size: {b64_size:,} bytes")

    # Generate script tag
    print("Generating script block...")
    script_lines = [
        "<script>",
        "// Embedded food database (gzip+base64, 1550 items)",
        "// Decompressed size: ~712KB -> Compressed: ~97KB (13.6%)",
        'var __FOOD_DB_EMBEDDED = "' + encoded + '";',
        "</script>",
    ]
    script_block = "\n".join(script_lines)

    # Embed into index.html before </head>
    print(f"Embedding into {INDEX_FILE}...")
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    # Remove any existing __FOOD_DB_EMBEDDED block
    html = re.sub(
        r"<script>\s*\n?\s*// Embedded food database.*?</script>\s*\n?",
        "",
        html,
        flags=re.DOTALL,
    )

    # Insert before </head>
    html = html.replace("</head>", script_block + "\n</head>")

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\nDone! Embedded data block inserted into index.html")
    print(f"  Saved: {original_size - compressed_size:,} bytes ({100-compressed_size/original_size*100:.1f}% reduction)")

if __name__ == "__main__":
    main()
