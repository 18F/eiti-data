(function(exports) {

  var map = d3.select('#map');
  var symbols = d3.select('svg#symbols');

  var proj = d3.geo.albersUsa();
  var path = d3.geo.path()
    .projection(proj);

  var data = {
    years: d3.set(),
    commodities: d3.set(),
    geo: {},
    revenues: {}
  };

  var TERRITORIES = d3.set(['PR', 'GU', 'VI']);

  var state = {
    breaks: 7,
    colors: 'RdPu',
    commodity: 'Oil & Gas'
  };

  var truth = d3.functor(true);

  d3.select('select[name="breaks"]')
    .selectAll('option')
      .data([3, 4, 5, 7, 9])
      .enter()
      .append('option')
        .text(function(d) { return d; });

  d3.select('select[name="colors"]')
    .selectAll('option')
      .data(Object.keys(colorbrewer)
        .filter(function(k) {
          return !k.match(/^(Dark|Set|Paired|Pastel|Accent)/);
        }))
      .enter()
      .append('option')
        .attr('value', function(k) { return k; })
        .text(function(k) {
          // return k + ' (' + Object.keys(colorbrewer[k]).join(', ') + ')';
          return k;
        });

  var form = new formdb.Form('#controls')
    .setData(state);

  queue()
    .defer(d3.json, 'data/geo/us-counties.json')
    .defer(d3.tsv, 'data/county-revenues.tsv')
    .await(function onload(error, topology, revenues) {

      revenues.forEach(parseRevenue);

      data.geo.topology = topology;
      data.geo.counties = meshify(topology, 'counties');

      data.revenues = revenues;

      var countiesByState = d3.nest()
        .key(function(d) { return d.properties.state; })
        .entries(topology.objects.counties.geometries);

      data.countiesByState = countiesByState;

      var stateArcs = countiesByState
        .filter(function(d) {
          return !TERRITORIES.has(d.key);
        })
        .map(function(d) {
          var state = d.key;
          var geom = topojson.mergeArcs(topology, d.values);
          geom.id = d.key;
          geom.properties = {
            state: d.key
          };
          return geom;
        });

      topology.objects.states = {
        type: 'GeometryCollection',
        geometries: stateArcs
      };

      data.geo.states = meshify(topology, 'states');

      data.index = d3.nest()
        .key(getter('CY'))
        .key(getter('Commodity'))
        .key(getter('County Code'))
        .map(revenues);

      /*
      var commodities = data.commodities = data.commodities.values()
        .sort(d3.ascending)

      d3.select('select[name="commodity"]')
        .selectAll('option')
        .data(commodities)
        .enter()
        .append('option')
          .attr('value', function(d) { return d; })
          .text(function(d) { return d ? d : 'All'; });
      */

      var years = data.years = data.years.values()
        .sort(d3.ascending);

      d3.select('input[name="year"]')
        .attr('min', years[0])
        .attr('max', years[years.length - 1]);

      state.year = years[0];

      form.setData(state);

      var update = function() {
        state = form.getData();
        updateOverviewMap();
        updateStateMaps();
      };

      form.on('change', update);

      createMap();
      createStateMaps();
      update();
    });

  function meshify(topology, key) {
    var object = topology.objects[key];
    var features = topojson.feature(topology, object).features;
    var mesh = topojson.mesh(topology, object);
    return {
      features: features,
      mesh: mesh
    };
  }

  function createMap() {
    var svg = map.append('svg')
      .attr('class', 'map');

    var counties = svg.append('g')
      .attr('class', 'areas counties')
      .call(renderAreas, data.geo.counties);

    var states = svg.append('g')
      .attr('class', 'areas states')
      .call(renderAreas, data.geo.states);

    states.selectAll('path.area')
      .attr('fill', 'none');

    var bbox = states.node().getBBox();
    svg.attr('viewBox', [bbox.x, bbox.y, bbox.width, bbox.height].join(' '));

    var areas = map.selectAll('g.counties path.area')
      .attr('id', function(d) {
        return d.FIPS;
      });

    areas.append('title')
      .text(function(d) {
        d.title = [d.properties.county, d.properties.state].join(', ');
        return d.title;
      });
  }

  function createStateMaps() {
    var root = d3.select('#states');
    var states = data.geo.states.features
      .sort(function(a, b) {
        return d3.ascending(a.id, b.id);
      });

    var div = root.selectAll('div.state')
      .data(states)
      .enter()
      .append('div')
        .attr('class', 'state')
        .attr('id', function(d) { return d.id; });

    div.append('h2')
      .text(function(d) { return d.id; });

    var svg = div.append('svg')
      .attr('class', 'map');

    var countiesByState = d3.nest()
      .key(function(d) { return d.properties.state; })
      .map(data.geo.counties.features);

    svg.append('g')
      .attr('class', 'areas counties')
      .selectAll('path.area')
      .data(function(d) {
        // XXX DC doesn't have counties
        return countiesByState[d.properties.state] || [];
      })
      .enter()
      .append('path')
        .attr('class', 'area')
        .attr('d', path);

    svg.append('g')
      .attr('class', 'mesh counties')
      .append('path')
        .attr('class', 'mesh')
        .attr('d', path(data.geo.counties.mesh));

    svg.append('g')
      .attr('class', 'mask states')
      .selectAll('path.area')
      .data(function(d) {
        return states.filter(function(s) {
          return s !== d;
        });
      })
      .enter()
      .append('path')
        .attr('class', 'area mask')
        .attr('d', path);

    var mask = svg.append('path')
      .attr('class', 'area outline')
      .attr('d', path)
      .attr('stroke-width', 2);

    var margin = 10;
    var outerSize = 600;
    svg.attr('viewBox', function(d) {
      var bounds = path.bounds(d);
      var x = bounds[0][0];
      var y = bounds[0][1];
      var w = bounds[1][0] - x;
      var h = bounds[1][1] - y;
      var m = Math.max(w, h) / outerSize * margin;
      return [x - m, y - m, w + m, h + m].join(' ');
    });
  }

  function updateOverviewMap() {
    // console.log('state:', state);
    d3.select('#year-display').text(state.year);
    var index = data.index[state.year][state.commodity];
    var valid = !!index;
    var message;
    if (!index) index = {};

    var areas = map.selectAll('g.counties path.area')
      .classed('empty', true)
      .classed('full', false)
      .filter(function(d) {
        d.rows = index[d.id] || [];
        return d.rows.length;
      })
      .each(function(d) {
        d.sum = d3.sum(d.rows, function(row) {
          return row.revenue;
        });
      })
      .classed('empty', false)
      .classed('full', true);

    var validData = areas.data();
    var zeroSum = function(d) { return d.sum === 0; };
    if (validData.length < 2) {
      console.warn('not enough data:', validData);
      valid = false;
      message = 'not enough data';
    } else if (validData.every(zeroSum)) {
      console.warn('all zeroes:', validData);
      valid = false;
      message = 'all zeroes';
    }

    var legend = map.select('.legend');
    if (valid) {

      var colors = colorbrewer[state.colors][state.breaks];
      var sums = validData.map(function(d) { return d.sum; });

      var extent = d3.extent(sums);
      if (extent[0] > 0) extent[0] = 0;
      var scale = d3.scale.quantize()
        .domain(extent)
        .range(colors);

      var fill = function(d) {
        return scale(d.sum);
      };
      areas.attr('fill', fill);

      d3.selectAll('#states g.counties path.area')
        .classed('empty', true)
        .classed('full', false)
        .filter(function(d) {
          return d.rows.length;
        })
        .classed('empty', false)
        .classed('full', true)
        .attr('fill', fill);

      var steps = colors.map(function(color) {
        var domain = scale.invertExtent(color);
        return {
          color: color,
          min: domain[0],
          max: domain[1]
        };
      });

      var item = legend.selectAll('.item')
        .data(steps);
      item.exit().remove();

      var enter = item.enter().append('div')
        .attr('class', 'item');
      enter.append('span')
        .attr('class', 'color');
      enter.append('span')
        .attr('class', 'min');
      enter.append('span')
        .attr('class', 'sep')
        .html(' &ndash; ');
      enter.append('span')
        .attr('class', 'max');

      item.select('.color')
        .style('background', function(d) { return d.color; });
      item.select('.min')
        .text(function(d) { return formatDollars(d.min); });
      item.select('.max')
        .text(function(d) { return formatDollars(d.max); });

      legend.select('.message')
        .style('display', 'none')
        .text('');

    } else {

      areas
        .classed('full', false)
        .classed('empty', true);

      legend.selectAll('.item')
        .remove();

      var text = 'No data for "' + state.commodity + '" in ' + state.year;
      if (message) text += ' (' + message + ')';
      legend.select('.message')
        .style('display', null)
        .text(text + '.');
    }
  }

  function updateStateMaps() {
  }

  function renderAreas(selection, geo) {
    selection.datum(geo);

    if (geo.features) {
      var area = selection.selectAll('path.area')
        .data(geo.features)
        .enter()
        .append('path')
          .attr('class', 'area')
          .attr('d', path);
    } else {
      console.log('no features');
    }

    if (geo.mesh) {
      selection.append('path')
        .attr('class', 'mesh')
        .datum(geo.mesh)
        .attr('d', path);
    }
  }

  function parseRevenue(d) {
    data.commodities.add(d.Commodity);
    data.years.add(d.CY);
    d.revenue = parseDollars(d['Royalty/Revenue']);
    return d;
  }

  function parseDollars(str) {
    str = str.trim();
    if (str.substr(0, 2) === '$ ') str = str.substr(2);
    var negative = false;
    if (str.charAt(0) === '(') {
      negative = true;
      str = str.substr(1, str.length - 2);
    }
    var num = +str;
    return negative ? -num : num;
  }

  var formatDecimal = d3.format(',.2f');
  function formatDollars(num) {
    return '$' + formatDecimal(num);
  }

  function makeFilter(filters) {
    var len = filters.length;
    return function(d) {
      for (var i = 0; i < len; i++) {
        if (!filters[i].call(this, d)) return false;
      }
      return true;
    };
  }

  function eq(value, key) {
    var accessor = getter(key);
    return function(d) {
      return accessor(d) == value;
    };
  }

  function getter(key) {
    return typeof key === 'function'
      ? key
      : key
        ? function(d) { return d[key]; }
        : identity;
  }

  function uniq(values, key) {
    var set = d3.set();
    var accessor = getter(key);
    values.forEach(function(d) {
      set.add(accessor(d));
    });
    return set.values();
  }

  function identity(d) {
    return d;
  }

  exports.parseDollars = parseDollars;

  exports.data = data;

})(window);
