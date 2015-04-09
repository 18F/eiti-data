var tito = require('tito');
var async = require('async');
var util = require('../util');

var read = util.readData;
var map = util.map;

async.parallel({
  revenues: readRevenues,
  counties: readCounties,
  states: readStates
}, function(error, results) {
  if (error) return console.log('Error:', error);

  results.revenues.forEach(function(d, i) {
    d.$line = i;
  });

  var statesByAbbr = map(results.states, 'abbr', true);
  var revenuesByState = map(results.revenues, 'St');

  for (var state in revenuesByState) {
    var goodFIPS = statesByAbbr[state].FIPS;
    var row = revenuesByState[state][0];
    var checkFIPS = row['County Code'].substr(0, 2);
    if (checkFIPS != goodFIPS) {
      var lines = revenuesByState[state].map(function(d) { return d.$line; });
      console.log(
        // 'mismatch:',
        checkFIPS, '(' + row.St + ') should be',
        goodFIPS,
        'on lines:', util.sequences(lines, 2)
      );
    }
  }
});

function readRevenues(done) {
  return read(
    'input/county-revenues.tsv',
    tito.formats.createReadStream('tsv'),
    done
  );
}

function readCounties(done) {
  return read(
    'geo/us-counties.json',
    tito.formats.createReadStream('json', {
      path: 'objects.counties.geometries.*.properties'
    }),
    done
  );
}

function readStates(done) {
  return read(
    'input/states.csv',
    tito.formats.createReadStream('csv'),
    done
  );
}
