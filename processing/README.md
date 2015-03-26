# Geo Data Processing
This directory contains scripts for geodata processing with [PostGIS].

## Setup
First, you'll need to create a [PostgreSQL] database. The easiest way to get
Postgres on OS X is with [Postgres.app](http://postgresapp.com/). Then, follow
the [PostGIS installation instructions](http://postgis.net/install/). Once
you've got Postgres running, do this in your shell:

```sh
createdb eiti-maps
echo "create extension postgis;" | psql eiti-maps
```

This will create the `eiti-maps` database and install the PostGIS extensions.
(This needs to be done on a per-database basis, so if you drop your database
you will need to run this query again.)

To ensure that things are working properly, you can try importing a Shapefile
into the database. **Note** if you haven't gotten the [Federal lands
layer](../tilemill/fedland) running in TileMill yet, you will need to do this
first:

```sh
cd tilemill/fedland/data
unzip fedland.zip
cd -
```

Once you've confirmed that `tilemill/fedland/data/fedland.shp` exists, you can
run this:

```sh
shp=tilemill/fedland/data/fedland.shp
shp2pgsql -d -I -s EPSG:900913 $shp fedland | psql eiti-maps
```

## Merging Shapefiles
The `merge.sh` script and its accompanying `merge*.sql` files create a single
shape that represents the *union* of Federally and Tribally managed lands.
To run it, simply run this in your shell from this directory:

```sh
./merge.sh
```

This does the following:

1. Import the Shapefiles for each layer into their own tables using
   `shp2pgsql`.
2. Create a `merge` table with just id and geometry columns (of the
   `GeometryCollection` PostGIS type) to store the results of each operation.
3. Use PostGIS's [ST_Collect()] to collect all of the geometries of each layer
   (table) into their own named rows in `merge`.
4. Use [ST_Union()] to combine the shapes using a [cascading union].
5. Buffer the resulting shape with [ST_Buffer()] as necessary to close any gaps
   between very close (but not coincident) shapes.

My first successful run of `merge.sh` took 2 hours in total: about half an hour
to import the Shapefiles, collect the geometries and add the [spatial index];
then an hour and a half for the union, and only a couple of minutes for the
buffer.

## Showing Your Work
When you're done you can check your work in TileMill by adding a PostGIS layer
to any of the projects, specifying:

* `merge` as the layer ID,
* `dbname=eiti-maps` as the connection string, and
* `merge` as the table/query

Then add the following CartoCSS to your stylesheet:

```carto
#merge {
  line-color: #ccc;
  
  [id='buffered'] {
    line-color: #33c;
  }
  
  [id='unioned'] {
    line-color: #c33;
  }
}
```

You should then see something like this when you zoom in:

![image](https://cloud.githubusercontent.com/assets/113896/6857076/83f9e5e4-d3c1-11e4-90aa-73c564368075.png)

which shows that the gray lines (the original Shapefile geometries)
have been merged into a single geometry (the red lines), and then
buffered into the blue (which will vary depending on the radius given
to `ST_Buffer()`).

[PostGIS]: http://postgis.net/
[PostgreSQL]: http://www.postgresql.org/
[ST_Collect()]: http://www.postgis.org/docs/ST_Collect.html
[ST_Union()]: http://www.postgis.org/docs/ST_Union.html
[cascading union]: http://lin-ear-th-inking.blogspot.com/2007/11/fast-polygon-merging-in-jts-using.html
[spatial index]: http://revenant.ca/www/postgis/workshop/indexing.html
[ST_Buffer()]: http://www.postgis.org/docs/ST_Buffer.html
