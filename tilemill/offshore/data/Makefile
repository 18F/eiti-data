base_url = http://www.boem.gov/Oil-and-Gas-Energy-Program/Mapping-and-Data

all: download unzip

download:
	curl -L "$(base_url)/Alaska/planarea.aspx" > alaska.zip
	curl -L "$(base_url)/ATL_PLAN(3).aspx" > atlantic.zip
	curl -L "http://www.data.boem.gov/homepg/pubinfo/repcat/arcinfo/zipped/planarea.zip" > gulf.zip
	curl -L "$(base_url)/Pacific-files/PC_PLANAREA.aspx" > pacific.zip

reproject: unzip
	for shp in *.shp; do ogr2ogr -F "ESRI Shapefile" -t_srs EPSG:900913 $${shp/.shp/}-merc.shp $$shp; done

unzip:
	unzip -u alaska.zip
	for file in AK_PLAN.*; do mv $$file alaska.$${file##*.}; done
	unzip -u atlantic.zip
	for file in ATL_PLAN.*; do mv $$file atlantic.$${file##*.}; done
	unzip -u gulf.zip
	for file in planarea.*; do mv $$file gulf.$${file##*.}; done
	unzip -u pacific.zip
	for file in PC_PLANAREA.*; do mv $$file pacific.$${file##*.}; done

.PHONY: download unzip reproject

clean:
	rm -f *.shp *.shx *.dbf *.prj *.htm *.sbn *.sbx *.xml

distclean: clean
	rm -f *.zip
