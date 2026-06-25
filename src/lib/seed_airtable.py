#!/usr/bin/env python3
"""
Seed Label Suite Postgres from Airtable Label Suite v3 (appoKM3ylTDhR60LY).

Maps Airtable tables → label_suite Postgres tables and inserts
all data via psql on Winona. Run from M1.

Usage:
    python3 src/lib/seed_airtable.py
"""

import json, os, subprocess, sys, uuid

# ── Airtable setup ──────────────────────────────────────────────
def get_airtable_key():
    path = os.path.expanduser("~/.hermes/.env")
    with open(path) as f:
        for line in f:
            if line.startswith("AIRTABLE_API_KEY=***    ...[truncated]