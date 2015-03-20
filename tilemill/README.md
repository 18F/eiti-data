# TileMill Projects
These directories are all intended to be loaded into [TileMill]. You will need
to perform some trickery to get them into TileMill's projects folder. For each
project that you want to open, do the following:

1. [Download] and install TileMill by dragging the application from the zip
   into your `/Applications` or `~/Applications` directory.
2. Run TileMill once to set up the example projects.
3. Quit TileMill.
4. In the Terminal, do this for each of the projects you plan to work on:
    ```sh
    # cd to this directory
    cd path/to/eiti-maps/tilemill
    # substitute "fedland" here with the name of the appropriate project directory
    ln -s fedland ~/Documents/Mapbox/project
    ```

5. Reopen TileMill. The project should be visible in the project list when it
   starts up. Double-click it to ensure that the data is loading.

## How it works
TileMill projects are just directories with a couple of files:

- `project.mml` - this is actually a JSON file describing the project, its
  layers and styles.
- `layers/` - TileMill caches downloaded and/or zipped data sources in this
  subdirectory so that it doesn't have to re-download them every time you open
  the project.
- `style.mms`, `*.mms` - these are the [CartoCSS] stylesheets that TileMill
  uses to render the maps.

## Adding data
Rather than check in all of the data that TileMill caches in the `layers`
directory, we're putting zipped Shapefiles in a `data` subdirectory of each
project. (Relative parent paths in `project.mml` won't work with our symlinks
because the paths are resolved as though they're relative to the TileMill
projects directory.) This means that TileMill can find the data file and cache
it as needed, but the downside is that we do still have to put these files in
git. In the future we could change the `project.mml` files to point at URLs
for the data.

For an example, see the [fedlands project.mml](fedland/project.mml#L46) and its
[data directory](fedlands/data).

[TileMill]: https://www.mapbox.com/tilemill/
[Download]: https://www.mapbox.com/tilemill/
[CartoCSS]: https://www.mapbox.com/tilemill/docs/manual/carto/
