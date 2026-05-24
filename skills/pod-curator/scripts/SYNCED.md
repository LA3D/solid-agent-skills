# Bundled audit tool (synced — do not edit here)

`pod_audit.py` + `shapes/substrate/*.ttl` are **synced copies**; canonical source is
`cogitarelink-solid` (`scripts/pod_audit.py`, `shapes/substrate/`). Bundled here so the
skill is self-contained (PEP 723 inline deps → `uv run` bootstraps httpx/rdflib/pyshacl;
no venv, no sibling-repo access). Re-sync after editing canonical:
`cd cogitarelink-solid && make sync-curator-skill`.
