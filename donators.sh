#!/usr/bin/env bash

INPUT="${1:-Transaction_All.csv}"
OUTPUT="${2:-donators.txt}"

python3 - "$INPUT" > "$OUTPUT" <<'PY'
import csv
import sys

with open(sys.argv[1], newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)

    for row in reader:
        name = row.get("From", "").strip()
        amount = row.get("Received", "").strip()

        if not name or not amount:
            continue

        try:
            amount = float(amount)

            if amount.is_integer():
                amount = int(amount)
        except ValueError:
            continue

        print(f"{name},{amount}")
PY
