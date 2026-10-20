import os
from contextlib import contextmanager

from flask import current_app
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


def create_pool(dsn):
    # Resource settings, not a user-session duration or response-time promise.
    return ConnectionPool(
        dsn, min_size=1, max_size=int(os.getenv("DB_POOL_MAX", "8")),
        max_waiting=int(os.getenv("DB_POOL_MAX_WAITING", "32")),
        timeout=float(os.getenv("DB_POOL_WAIT_SECONDS", "5")),
        kwargs={"row_factory": dict_row, "connect_timeout": 5,
                "options": "-c statement_timeout=10000 -c lock_timeout=5000"},
        open=True,
    )


@contextmanager
def transaction(app=None, read_only=False):
    """One short transaction per request/command; commits on success, rolls back on any error.

    In test mode only, TEST_CLOCK replaces now() for this transaction (registration.clock_now()).
    """
    app = app or current_app
    with app.extensions["db_pool"].connection() as conn:
        if read_only:
            conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        clock = app.config.get("TEST_CLOCK")
        if clock:
            conn.execute("SELECT set_config('islah.test_clock', %s, true)", (clock,))
        yield conn
