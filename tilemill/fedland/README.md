# Federal Lands
This map shows all Federal lands. The data is from [USGS](http://catalog.data.gov/dataset/usgs-small-scale-dataset-federal-lands-of-the-united-states-200606-shapefile)
and can be downloaded directly at:

```
http://dds.cr.usgs.gov/pub/data/nationalatlas/fedlanp020_nt00012.tar.gz
```

For this repository I've reprojected the data into the [Google Mercator
projection], which makes it faster to render in TileMill because it won't have
to be reprojected on the fly. Here's how I reprojected it:

```sh
ogr2ogr -s_srs EPSG:4326 -t_srs EPSG:900913 fedland.shp fedlanp020_nt00012.shp
```

[Google Mercator projection]: http://spatialreference.org/ref/sr-org/google-projection/
