#!/usr/bin/env node
var yargs = require('yargs')
  .usage('$0 [options]')
  .describe('in-topo', 'input TopoJSON (assumed to be US counties)')
  .default('in-topo', './geo/us-counties.json')
  .describe('in-revenues', 'county revenues data (tab-separated)')
  .default('in-revenues', './input/county-revenues.tsv')
  .describe('in-states', 'states data CSV w/abbr, FIPS and name fields')
  .default('in-states', './input/states.csv')
  .describe('out-topo', 'output TopoJSON (with counties and states) to this file')
  .default('out-topo', 'us-topology.json')
  .describe('out-revenues', 'output parsed revenue data to this file')
  .default('out-revenues', 'county-revenues.tsv')
  .describe('all-counties', "don't filter out counties without data (which is the default)")
  .alias('in-topo', 'it')
  .alias('in-revenues', 'ir')
  .alias('in-states', 'is')
  .alias('out-topo', 'ot')
  .alias('out-revenues', 'or')
  .alias('all-counties', 'a')
  .alias('h', 'help')
  .wrap(120);
var options = yargs.argv;

if (options.help) {
  return yargs.showHelp();
}

var fs = require('fs');
var tito = require('tito');
var async = require('async');
var topojson = require('topojson');
var d3 = require('d3');
var util = require('./util');
var assert = require('assert');
var streamify = require('stream-array');
var through2 = require('through2');

var read = util.readData;
var map = util.map;
var get = util.getter;

async.parallel({
  revenues: function readRevenues(done) {
    return read(
      options['in-revenues'],
      function(stream) {
        return stream
        .pipe(tito.formats.createReadStream('tsv'))
        .pipe(createRevenueParseStream());
      },
      done
    );
  },
  states: function readStates(done) {
    return read(
      options['in-states'],
      tito.formats.createReadStream('csv'),
      done
    );
  },
  counties: function readCounties(done) {
    return done(null, require(options['in-topo']));
  }
}, function(error, data) {
  if (error) return console.error('error:', error);

  var revenues = data.revenues;
  var states = data.states;
  var topology = data.counties;

  var statesByAbbr = map(states, 'abbr', true);

  // turn them into GeoJSON features
  var counties = topology.objects.counties.geometries;
  var countyFeatures = topojson.feature(topology, topology.objects.counties).features;

  // group counties by state to infer states
  var countiesByState = d3.nest()
    .key(function(d) {
      return d.properties.state;
    })
    .entries(counties);

  // American Samoa, Puerto Rico, Guam and Virgin Islands
  var territories = d3.set(['AS', 'PR', 'GU', 'VI']);

  var stateFeatures = countiesByState
    // filter out territories
    .filter(function(d) {
      return !territories.has(d.key);
    })
    // merge counties into states
    .map(function(d) {
      var abbr = d.key;
      var geom = topojson.merge(topology, d.values);
      return {
        id: abbr,
        properties: statesByAbbr[abbr],
        geometry: geom
      };
    });

  assert.equal(stateFeatures.length, 51);

  // fix the FIPS ids, because some numbers lack the 0 prefix
  countyFeatures.forEach(function(d) {
    d.id = d.properties.FIPS;
  });

  // fix the revenue FIPS codes
  revenues.forEach(function(d) {
    var state = statesByAbbr[d.state];
    d.FIPS = state.FIPS + d.FIPS.substr(2);
  });

  var index = d3.nest()
    .key(get('FIPS'))
    .key(get('year'))
    .key(get('commodity'))
    .map(revenues);

  if (!options['all-counties']) {
    countyFeatures = countyFeatures.filter(function(d) {
      return d.id in index;
    });
  }

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

  console.warn('writing topology to:', options['out-topo']);
  fs.createWriteStream(options['out-topo'])
    .write(JSON.stringify(out));

  console.warn('writing county revenues to:', options['out-revenues']);
  streamify(revenues)
    .pipe(tito.formats.createWriteStream('tsv'))
    .pipe(fs.createWriteStream(options['out-revenues']));
});

function createRevenueParseStream() {
  var revenueKey = 'Royalty/Revenue';
  var parse = function(d) {
    // console.warn(d);
    return {
      year:       d.CY,
      state:      d.St,
      // county:  d.County,
      FIPS:       d['County Code'],
      commodity:  d.Commodity,
      // type:    d['Revenue Type'],
      revenue:    util.parseDollars(d[revenueKey])
    };
  };

  var i = 0;
  return through2.obj(function parseRevenue(d, enc, next) {
    // process.stderr.write('.');
    var result = parse(d);
    i++;
    if (isNaN(result.revenue)) {
      console.warn('Unable to parse revenue value: "%s" in row %d', d[revenueKey], i);
      return next();
    }
    next(null, result);
  })
}
