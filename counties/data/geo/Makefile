all: us-counties-small.json

us-counties-small.json: us-counties.json
	topojson \
		--simplify 2e-6 -q 5000 \
		--properties -- \
		$< > $>
	du -sch us-counties*.json

clean:
	rm -f us-counties-small.json
