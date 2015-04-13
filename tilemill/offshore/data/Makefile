base_url = http://www.boem.gov/Oil-and-Gas-Energy-Program/Mapping-and-Data
layers = alaska atlantic gulf pacific
topojson_options ?= --simplify 1e-10
shp_filter ?= "MMS_PLAN_A IS NOT NULL AND MMS_PLAN_A NOT IN ('LND', 'NUS')"

all: download reproject rezip

.PHONY: download reproject rezip topojson geojson

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

topojson: $(foreach layer,$(layers),topo/$(layer).json)

geojson: $(foreach layer,$(layers),geo/$(layer).json)

topo/%.json: shp/%.shp
	mkdir -p topo
	ogr2ogr -f GeoJSON -t_srs EPSG:4326 /dev/stdout $< | topojson -p -o $@ $(topojson_options) -- $*=/dev/stdin 

geo/%.json: topo/%.json
	mkdir -p geo
	topojson-geojson -o geo $(topojson_options) $<
	mv geo/stdin.json $@

filter:
	for shp in shp/*.shp; do ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:900913 -where $(shp_filter) $${shp/.shp/}-filtered.shp $$shp; done
	for fil in shp/*-filtered.*; do mv $$fil $${fil/-filtered/}; done

reproject:
	for shp in shp/*.shp; do ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:900913 -where $(shp_filter) $${shp/.shp/}-merc.shp $$shp; done
	for merc in shp/*-merc.*; do mv $$merc $${merc/-merc/}; done

rezip:
	rm -f shp/*.zip
	cd shp; for layer in $(layers); do zip $$layer.zip $$layer.*; done

clean:
	rm -rf shp
	rm -rf topo/*.json
	rm -rf geo/*.json
