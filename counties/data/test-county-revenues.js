var fs = require('fs');
var tito = require('tito');
var async = require('async');

async.parallel({
  revenues: readRevenues,
  counties: readCounties,
  states: readStates
}, function(error, results) {
  if (error) return console.log('Error:', error);

  var countiesByFIPS = map(results.counties, 'FIPS');
  var statesByFIPS = map(results.states, 'FIPS');
  var statesByAbbr = map(results.states, 'abbr');
  var revenuesByState = map(results.revenues, 'St');

  for (var state in revenuesByState) {
    var goodFIPS = statesByAbbr[state][0].FIPS;
    var row = revenuesByState[state][0];
    var checkFIPS = row['County Code'].substr(0, 2);
    if (checkFIPS != goodFIPS) {
      var lines = revenuesByState[state].map(function(d) { return d.$line; });
      console.log(
        // 'mismatch:',
        checkFIPS, '(' + row.St + ') should be',
        goodFIPS,
        'on lines:', sequences(lines, 2)
      );
    }
  }
});

function readRevenues(done) {
  return read('county-revenues.tsv',
    tito.formats.createReadStream('tsv'),
    done);
}

function readCounties(done) {
  return read('geo/us-counties.json',
    tito.formats.createReadStream('json', {
      path: 'objects.counties.geometries.*.properties'
    }),
    done);
}

function readStates(done) {
  return read('states.csv',
    tito.formats.createReadStream('csv'),
    done);
}

function read(filename, parse, done) {
  var data = [];
  fs.createReadStream(filename)
    .pipe(parse)
    .on('data', function(d) {
      d.$line = data.length;
      data.push(d);
    })
    .on('error', done)
    .on('end', function() {
      done(null, data);
    });
}

function map(list, key) {
  key = getter(key);
  var map = {};
  list.forEach(function(d) {
    var k = key(d);
    if (map.hasOwnProperty(k)) {
      map[k].push(d);
    } else {
      map[k] = [d];
    }
  });
  return map;
}

function getter(key) {
  if (!key) return identity;
  else if (typeof key === 'function') return key;
  return function(d) { return d[key]; };
}

function identity(d) {
  return d;
}

function sequences(lines, offset) {
  offset = offset || 0;
  var len = lines.length;
  if (len < 2) return lines.join(', ');
  var seq = [];
  var l0 = lines[0];
  var last = l0;
  for (var i = 1; i < len; i++) {
    if (lines[i] === last + 1) {
      last = lines[i];
      continue;
    }
    last = lines[i - 1];
    if (l0 === last) {
      seq.push(last + offset);
    } else {
      seq.push([l0 + offset, last + offset].join('-'));
    }
    l0 = last = lines[i];
  }
  if (l0 === last) {
    seq.push(last + offset);
  }
  return seq.join(', ');
}
