#!/bin/sh
SRID="EPSG:900913"
echo "importing data..."
time shp2pgsql -d -I -s $SRID tilemill/fedland/data/fedland.shp fedland | psql eiti-maps
time shp2pgsql -d -I -s $SRID tilemill/tribal-areas/data/tribal-lands.shp tribal | psql eiti-maps
echo "collecting geometries..."
time cat merge-collect.sql | psql eiti-maps
echo "union-ing..."
time cat merge-union.sql | psql eiti-maps
echo "buffering..."
time cat merge-buffer.sql | psql eiti-maps
echo "all done!"
