"""Quick PostgreSQL check for start_project.bat (connect_timeout, no import side effects)."""

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.database import check_db_connection, ensure_database_exists  # noqa: E402

if __name__ == "__main__":
    try:
        ensure_database_exists(timeout_seconds=8)
        check_db_connection(timeout_seconds=8)
        print("postgres-ok")
    except Exception as exc:
        print(f"postgres-fail: {exc}", file=sys.stderr)
        sys.exit(1)
