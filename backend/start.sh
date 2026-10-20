#!/usr/bin/env bash
# Local development launcher. Invoke with Git Bash on Windows, not WSL.
set +x
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ -x .venv/Scripts/python.exe ]]; then
  python_path=.venv/Scripts/python.exe
elif [[ -x .venv/bin/python ]]; then
  python_path=.venv/bin/python
else
  printf '%s\n' 'Virtual environment belum ada. Buat .venv dan install requirements.txt terlebih dahulu.' >&2
  exit 1
fi

exec "$python_path" -B scripts/local_backend.py "$@"
