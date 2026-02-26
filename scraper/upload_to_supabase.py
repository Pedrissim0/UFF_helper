"""
Envia db_disciplinas.json para a tabela 'disciplinas' no Supabase.
Usa upsert em (codigo, turma) para ser idempotente — pode rodar quantas vezes quiser.

Uso:
    python scraper/upload_to_supabase.py
"""

import json
import pathlib
import os
from dotenv import load_dotenv
from supabase import create_client

ROOT = pathlib.Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
JSON_PATH = ROOT / "web" / "data" / "db_disciplinas.json"
BATCH_SIZE = 200


def main():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    with JSON_PATH.open(encoding="utf-8") as f:
        materias = json.load(f)

    total = len(materias)
    print(f"[INFO] {total} disciplinas carregadas de {JSON_PATH.name}")

    enviadas = 0
    for i in range(0, total, BATCH_SIZE):
        batch = materias[i : i + BATCH_SIZE]
        result = client.table("disciplinas").upsert(
            batch,
            on_conflict="codigo,turma",
        ).execute()
        enviadas += len(batch)
        print(f"  [{enviadas}/{total}] upsert OK")

    print(f"\n[OK] {total} disciplinas sincronizadas com o Supabase.")

    # ── Sync professores ──────────────────────────────
    profs = set()
    for m in materias:
        docente = (m.get("docente") or "").strip()
        if docente and docente != "Sem professor alocado":
            profs.add(docente)

    prof_rows = [{"name": name} for name in sorted(profs)]
    total_profs = len(prof_rows)
    print(f"\n[INFO] {total_profs} professores únicos encontrados")

    enviados = 0
    for i in range(0, total_profs, BATCH_SIZE):
        batch = prof_rows[i : i + BATCH_SIZE]
        client.table("professors").upsert(
            batch,
            on_conflict="name",
            ignore_duplicates=True,
        ).execute()
        enviados += len(batch)
        print(f"  [{enviados}/{total_profs}] professors upsert OK")

    print(f"[OK] {total_profs} professores sincronizados com o Supabase.")


if __name__ == "__main__":
    main()
