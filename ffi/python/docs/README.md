## Updating the doc

Important files:

- conf.py
- classes.rst

Add a new `.py` file for the newly added classe

## Building the doc

Move to the `doc` directory and run:

```
make html
```

## Checking the doc locally

```
pip install sphinx-autobuild
```

Then run:

```
sphinx-autobuild source build/html
```
