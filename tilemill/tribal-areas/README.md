# Tribal Areas

![](https://raw.githubusercontent.com/18F/eiti-maps/master/tilemill/tribal-areas/preview.png)

This map shows all US Tribal areas. The data is from
[US Census 2013 2013 TIGER/Line Shapefiles: American Indian Area Geography](https://www.census.gov/cgi-bin/geo/shapefiles2013/layers.cgi).

I've reprojected the data into the [Google Mercator projection], which makes it
faster to render in TileMill because it won't have to be reprojected on the
fly. Here's how I reprojected it:

```sh
ogr2ogr -t_srs EPSG:900913 tribal-lands.shp tl_2013_us_aiannh.shp
```

[Google Mercator projection]: http://spatialreference.org/ref/sr-org/google-projection/
