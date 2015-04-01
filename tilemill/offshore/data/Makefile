base_url = http://www.boem.gov/Oil-and-Gas-Energy-Program/Mapping-and-Data
layers = alaska atlantic gulf pacific

all: download reproject rezip

.PHONY: download reproject rezip

download: \
	shp/alaska.shp \
	shp/atlantic.shp \
	shp/gulf.shp \
	shp/pacific.shp

shp/alaska.zip:
	mkdir -p $(dir $@)
	curl -L "$(base_url)/Alaska/planarea.aspx" > $@

shp/atlantic.zip:
	mkdir -p $(dir $@)
	curl -L "$(base_url)/ATL_PLAN(3).aspx" > $@

shp/gulf.zip:
	mkdir -p $(dir $@)
	curl -L "http://www.data.boem.gov/homepg/pubinfo/repcat/arcinfo/zipped/planarea.zip" > $@

shp/pacific.zip:
	mkdir -p $(dir $@)
	curl -L "$(base_url)/Pacific-files/PC_PLANAREA.aspx" > $@

shp/%.shp: shp/%.zip
	unzip -d $(basename $@) $<
	for file in $(basename $@)/*.???; do mv $$file $(basename $@).$${file##*.}; done
	rmdir $(basename $@)

reproject:
	for shp in shp/*.shp; do ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:900913 $${shp/.shp/}-merc.shp $$shp; done
	for shp in shp/*-merc.*; do mv $$shp $${shp/-merc/}; done

rezip:
	rm -f shp/*.zip
	for layer in $(layers); do zip shp/$$layer.zip shp/$$layer.*; done

tidy:
	rm -f shp/*.{shp,shx,dbf,prj,htm,sbn,sbx,xml}

clean: tidy

distclean: clean
	rm -f shp/*.zip
