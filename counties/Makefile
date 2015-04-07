all: us.json

data/us.json: data/us-counties.json
	topojson-merge --io counties --oo states --key 'd.state' -p -- $< > $@
