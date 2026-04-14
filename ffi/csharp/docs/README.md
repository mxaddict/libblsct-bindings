# NavioBlsct Documentation

Docs are built with [DocFX](https://dotnet.github.io/docfx/).

## Prerequisites

.NET SDK and the ASP.NET Core runtime are required:

- **Arch Linux:** `sudo pacman -S dotnet-sdk aspnet-runtime`
- **Ubuntu/Debian:** `sudo apt install dotnet-sdk-8.0 aspnetcore-runtime-8.0`
- **macOS (Homebrew):** `brew install dotnet`

Then install DocFX:

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

`--serve` requires `Microsoft.AspNetCore.App` runtime. If unavailable, serve
`_site/` manually:

```bash
docfx docfx.json
cd _site && python3 -m http.server 8080
```

Then open `http://localhost:8080`.

If `Microsoft.AspNetCore.App` is installed, you can use the built-in server
instead:

```bash
docfx docfx.json --serve
```

## Updating

- To add a new article, create a `.md` file in `articles/` and add it to
  `articles/toc.yml`.
- API reference is regenerated automatically from XML doc comments in
  `Blsct.cs`.
