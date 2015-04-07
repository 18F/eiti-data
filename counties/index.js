(function(exports) {

  var proj = d3.geo.albersUsa();
  var path = d3.geo.path()
    .projection(proj);

  var map = d3.select('#map');

  var data = {
    geo: {
    },
    revenues: {
    }
  };

  var SKIP_FIPS = d3.set([78]);

  var form = new formdb.Form('#controls');

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

  var state = {
    breaks: 7,
    colors: 'RdPu'
  };

  queue()
    .defer(d3.json, 'data/geo/us-counties.json')
    .defer(d3.tsv, 'data/county-revenues.tsv')
    .await(function onload(error, topology, revenues) {

      data.geo.topology = topology;
      data.geo.counties = meshify(topology, 'counties');

      data.revenues.counties = revenues;

      var countiesByState = d3.nest()
        .key(function(d) { return d.properties.state; })
        .entries(topology.objects.counties.geometries);

      var stateArcs = countiesByState
        .filter(function(d) {
          return !SKIP_FIPS.has(d.key);
        })
        .map(function(d) {
          var state = d.key;
          var geoms = d.values;
          return topojson.mergeArcs(topology, geoms);
        });

      topology.objects.states = {
        type: 'GeometryCollection',
        geometries: stateArcs
      };

      data.geo.states = meshify(topology, 'states');

      var commodities = uniq(revenues, 'Commodity')
        .sort(d3.ascending);

      commodities.unshift('');

      d3.select('select[name="commodity"]')
        .selectAll('option')
        .data(commodities)
        .enter()
        .append('option')
          .attr('value', function(d) { return d; })
          .text(function(d) { return d ? d : 'All'; });

      var years = uniq(revenues, 'CY')
        .sort(d3.ascending);

      d3.select('input[name="year"]')
        .attr('min', years[0])
        .attr('max', years[years.length - 1])
        .attr('value', years[0]);

      form.setData(state);
      form.on('change', function(d) {
        state = d;
        updateState();
      });

      createMap();
      updateState();
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

    var rowsByCounty = d3.nest()
      .key(function(d) { return d['County Code']; })
      .map(data.revenues.counties);

    var areas = map.selectAll('g.counties path.area')
      .attr('id', function(d) {
        return d.FIPS;
      })
      .each(function(d) {
        var fips = d.id;
        var rows = rowsByCounty[fips] || [];
        d.data = rows.map(function(row) {
          row.revenue = parseDollars(row['Royalty/Revenue']);
          return row;
        });
      });

    areas.append('title')
      .text(function(d) {
        d.title = [d.properties.county, d.properties.state].join(', ');
        return d.title;
      });
  }

  function updateState() {
    var filters = [];
    if (state.year) {
      d3.select('#year-display').text(state.year);
      filters.push(eq('CY', state.year));
    }
    if (state.commodity) {
      filters.push(eq('Commodity', state.commodity));
    }

    var filter = filters.length
      ? makeFilter(filters)
      : d3.functor(true);

    var areas = map.selectAll('g.counties path.area')
      .classed('empty', true)
      .filter(function(d) {
        d.rows = d.data.filter(filter);
        return d.rows.length;
      })
      .each(function(d) {
        d.sum = d3.sum(d.rows, function(row) {
          return row.revenue;
        });
      })
      .classed('empty', false);

    var sums = areas
      .data()
      .map(function(d) { return d.sum; });

    var colors = colorbrewer[state.colors][state.breaks];

    var extent = d3.extent(sums);
    if (extent[0] > 0) extent[0] = 0;
    var scale = d3.scale.quantize()
      .domain(extent)
      .range(colors);

    areas.attr('fill', function(d) {
      return scale(d.sum);
    });

    var legend = map.select('.legend');
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
      .html('&mdash;');
    enter.append('span')
      .attr('class', 'max');

    item.select('.color')
      .style('background', function(d) { return d.color; });
    item.select('.min')
      .text(function(d) { return formatDollars(d.min); });
    item.select('.max')
      .text(function(d) { return formatDollars(d.max); });
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

  function eq(field, value) {
    var accessor = getter(field);
    return function(d) {
      return accessor(d) == value;
    };
  }

  function getter(key) {
    return typeof key === 'function'
      ? key
      : function(d) { return d[key]; };
  }

  function uniq(values, key) {
    var set = d3.set();
    var accessor = key ? getter(key) : identity;
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
