# NavioBlsct Documentation

Docs are built with [DocFX](https://dotnet.github.io/docfx/).

## Prerequisites

```bash
dotnet tool install -g docfx
```

## Building

From the `ffi/csharp/docs/` directory:

```bash
docfx docfx.json
```

This runs two phases:
1. **Metadata** — reads `NavioBlsct.csproj` and emits YAML into `api/`.
2. **Build** — combines YAML + Markdown articles into `_site/`.

## Previewing locally

```bash
docfx docfx.json --serve
```

Then open `http://localhost:8080`.

## Updating

- To add a new article, create a `.md` file in `articles/` and add it to `articles/toc.yml`.
- API reference is regenerated automatically from XML doc comments in `Blsct.cs`.
