var fs = require('fs');
var tito = require('tito');
var async = require('async');
var topojson = require('topojson');
var d3 = require('d3');
var util = require('./util');
var assert = require('assert');
var streamify = require('stream-array');

var read = util.readData;
var map = util.map;
var get = util.getter;

var TERRITORIES = d3.set(['AS', 'PR', 'GU', 'VI']);

var REVENUES_FILENAME = 'revenues-parsed.tsv';
var TOPOLOGY_FILENAME = 'us-topology.json';

async.parallel({
  revenues: readRevenues,
  states: readStates,
  counties: readCounties
}, function(error, data) {
  if (error) return console.error('error:', error);

  var revenues = data.revenues;
  var states = data.states;
  var topology = data.counties;

  var statesByAbbr = map(states, 'abbr', true);

  // turn them into GeoJSON features
  var counties = topology.objects.counties;
  var countyFeatures = topojson.feature(topology, counties).features;
  counties = counties.geometries;

  // group counties by state to infer states
  var countiesByState = d3.nest()
    .key(function(d) {
      return d.properties.state;
    })
    .entries(countyFeatures);

  var stateFeatures = countiesByState
    // filter out territories
    .filter(function(d) {
      return !TERRITORIES.has(d.key);
    })
    // merge counties into states
    .map(function(d) {
      var abbr = d.key;
      var feature = topojson.merge(topology, d.values);
      feature.id = abbr;
      feature.properties = statesByAbbr[abbr];
      return feature;
    });

  assert.equal(stateFeatures.length, 51);

  // fix the FIPS ids, because some numbers lack the 0 prefix
  countyFeatures.forEach(function(d) {
    d.id = d.properties.FIPS;
  });

  // fix the revenue FIPS codes
  var revenuesByState = map(revenues, 'St');
  var parsed = [];
  for (var abbr in revenuesByState) {
    revenuesByState[abbr].forEach(function(d) {
      var code = d['County Code'];
      var state = statesByAbbr[d.St];
      parsed.push({
        year: d.CY,
        commodity: d.Commodity,
        type: d['Revenue Type'],
        revenue: util.parseDollars(d['Royalty/Revenue']),
        state: state.name,
        county: d.County,
        FIPS: state.FIPS + code.substr(2)
      });
    });
  }

  var index = d3.nest()
    .key(get('FIPS'))
    .key(get('year')) // year
    .key(get('commodity'))
    .map(parsed);

  countyFeatures = countyFeatures.filter(function(d) {
    return d.id in index;
  });

  var out = topojson.topology({
    counties: {
      type: 'FeatureCollection',
      features: countyFeatures
    },
    states: {
      type: 'FeatureCollection',
      features: stateFeatures
    }
  }, {
    'verbose': true,
    'coordinate-system': 'spherical',
    'stitch-poles': true,
    // preserve all properties
    'property-transform': function(d) {
      return d.properties;
    }
  });

  var c = out.objects.counties.geometries;
  assert.ok(c[0].type, 'no type for county geometry' + JSON.stringify(c[0]));

  fs.createWriteStream(TOPOLOGY_FILENAME)
    .write(JSON.stringify(out));

  streamify(parsed)
    .pipe(tito.formats.createWriteStream('tsv'))
    .pipe(fs.createWriteStream(REVENUES_FILENAME));
});

function readRevenues(done) {
  return read(
    'county-revenues.tsv',
    tito.formats.createReadStream('tsv'),
    done
  );
}

function readStates(done) {
  return read(
    'states.csv',
    tito.formats.createReadStream('csv'),
    done
  );
}

function readCounties(done) {
  return done(null, require('./geo/us-counties.json'));
}

function rename(obj, src, dest) {
  obj[dest] = obj[src];
  delete obj[src];
}
