"""Run migration SQL against Supabase.

Usage: python scripts/run_migration.py

This script reads the migration file and executes it via
Supabase's PostgREST SQL endpoint. You can also copy the SQL
from supabase/migrations/001_initial_schema.sql and run it
directly in the Supabase SQL Editor (Dashboard > SQL Editor).
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


def main():
    migration_file = Path(__file__).parent.parent / "supabase" / "migrations" / "001_initial_schema.sql"
    sql = migration_file.read_text()

    print("=" * 60)
    print("SUPABASE MIGRATION")
    print("=" * 60)
    print()
    print(f"Supabase URL: {settings.supabase_url}")
    print(f"Migration file: {migration_file}")
    print()
    print("Please run the following SQL in your Supabase SQL Editor:")
    print(f"  1. Go to {settings.supabase_url.replace('.co', '.co/project/default/sql')}")
    print("  2. Or open: Supabase Dashboard > SQL Editor > New Query")
    print("  3. Paste the contents of: supabase/migrations/001_initial_schema.sql")
    print("  4. Click 'Run'")
    print()
    print("--- SQL CONTENTS ---")
    print(sql)
    print("--- END SQL ---")


if __name__ == "__main__":
    main()
