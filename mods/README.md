# Downloadable database packs (mods)

This folder contains example "database pack" mod bundles.

These are **not shipped** as part of the default game data. Players can import them via the in-game Database Manager / Mods UI.

## Files

- `real-world-db.catalog.json`: Human-editable source data (providers, studios, franchises, etc).
- `real-world-db.bundle.json`: Generated mod bundle that the game imports.

## Build the bundle

```sh
node scripts/build-real-world-db.mjs
```

This reads `mods/real-world-db.catalog.json` and writes `mods/real-world-db.bundle.json`.

## Import in-game

1. Open the Database Manager.
2. Create a new database slot (or pick a non-default slot).
3. Use Import JSON and select `mods/real-world-db.bundle.json`.

The default database remains protected (cannot be overwritten/deleted).
