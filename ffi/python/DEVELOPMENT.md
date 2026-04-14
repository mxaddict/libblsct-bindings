# Development

## Setting up the environment

1. Swig

- macOS

```bash
brew install swig
```

- Ubuntu

```bash
sudo apt-get install swig
```

1. cd to `ffi/python` directory

1. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

1. Install the required packages

```bash
pip install --upgrade pip
pip install setuptools build
```

## Building the package

1. Configure navio-core repository info in `setup.py`:

```
IS_PROD = True
...
if IS_PROD:
  navio_core_repo = "https://github.com/nav-io/navio-core"
  # git ls-remote https://github.com/nav-io/navio-core.git refs/heads/master
  navio_core_master_sha = "..."
else:
  navio_core_repo = "https://github.com/gogoex/navio-core"
  navio_core_branch = "add-missing-deser-funcs"
```

2. Activate virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

## Testing the package

Note that to reflect the changes to the python wrapper in tests, a new package
needs to be built and installed. Making changes to tests themselves works
locally.

```bash
python -m build
pip install dist/*.whl --force-reinstall
pytest tests -vv -s
```

### Testing the doctest in REPL

1. Go up to the parent directory to avoid to use the local source code
2. Start REPL and paste the doctest
