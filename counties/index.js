(function(exports) {

  // things to render data into
  var map = d3.select('#map');
  var symbols = d3.select('svg#symbols');
  var status = d3.select('#status');

  // map projection and svg path generator
  var proj = d3.geo.albersUsa();
  var path = d3.geo.path()
    .projection(proj);

  // app-wide data
  var data = {
    years: d3.set(),
    commodities: d3.set(),
    geo: {},
    revenues: {}
  };

  // US territories to ignore
  var TERRITORIES = d3.set(['PR', 'GU', 'VI']);

  // initial app state
  var state = {
    breaks: 7,
    colors: 'RdPu',
    commodity: 'Oil & Gas'
  };

  // colorbrewer color schemes -> <select>
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

  // colorbrewer color schemes breaks -> <select>
  d3.select('select[name="breaks"]')
    .selectAll('option')
      .data([3, 4, 5, 7, 9])
      .enter()
      .append('option')
        .text(identity);

  // save state in the form
  var form = new formdb.Form('#controls')
    .setData(state);

  status.text('Loading...');

  // load everything!
  queue()
    .defer(d3.json, 'data/geo/us-counties.json')
    .defer(d3.tsv, 'data/county-revenues.tsv')
    .await(function onload(error, topology, revenues) {
      status.text('Loaded, prepping data...');

      // parse the revenue numbers and add unique values
      // to the year and commodity sets
      revenues.forEach(parseRevenue);

      // stash these for use later
      data.geo.topology = topology;
      data.geo.counties = meshify(topology, 'counties');

      // save this, too, so we can look at it in the console
      data.revenues = revenues;

      // group counties by state
      var countiesByState = d3.nest()
        .key(function(d) { return d.properties.state; })
        .entries(topology.objects.counties.geometries);

      // generate TopoJSON arcs for each state
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

      // add states into the topology
      // (since they reference the same arcs)
      topology.objects.states = {
        type: 'GeometryCollection',
        geometries: stateArcs
      };

      data.geo.states = meshify(topology, 'states');

      // the index: year -> commodity -> FIPS
      data.index = d3.nest()
        .key(getter('CY'))
        .key(getter('Commodity'))
        .key(getter('County Code'))
        .map(revenues);

      /*
      // XXX uncomment this to list all commodities
      var commodities = data.commodities = data.commodities.values()
        .sort(d3.ascending)

      d3.select('select[name="commodity"]')
        .selectAll('option')
        .data(commodities)
        .enter()
        .append('option')
          .attr('value', identity)
          .text(function(d) { return d ? d : 'All'; });
      */

      // get the set of unique years
      var years = data.years = data.years.values()
        .sort(d3.ascending);

      // and set that as the range on the year input
      d3.select('input[name="year"]')
        .attr('min', years[0])
        .attr('max', years[years.length - 1]);

      // default to the first year
      state.year = years[0];

      // apply the initial state to the form
      form.setData(state);

      var update = function() {
        state = form.getData();
        updateOverviewMap();
        updateStateMaps();
      };

      form.on('change', update);

      status.text('Creating maps...');

      // create the document structure
      createMap();
      createStateMaps();

      // update the data
      update();

      // remove the status message
      status.text('').remove();
    });

  /*
   * collect the GeoJSON features and generate a mesh for a given
   * key in the provided topology, e.g.:
   *
   * var states = meshify(topology, 'states');
   */
  function meshify(topology, key) {
    var object = topology.objects[key];
    var features = topojson.feature(topology, object).features;
    var mesh = topojson.mesh(topology, object);
    return {
      features: features,
      mesh: mesh
    };
  }

  /*
   * initialize the big map
   */
  function createMap() {
    var svg = map.append('svg')
      .attr('class', 'map');

    var counties = svg.append('g')
      .attr('class', 'areas counties');

    counties.selectAll('path.area')
      .data(data.geo.counties.features)
      .enter()
      .append('path')
        .attr('class', 'area county')
        .attr('d', path);

    counties.append('path')
      .attr('class', 'mesh')
      .datum(data.geo.counties.mesh)
      .attr('d', path);

    var states = svg.append('g')
      .attr('class', 'areas states');

    states.selectAll('a')
      .data(data.geo.states.features)
      .enter()
      .append('a')
        .attr('xlink:href', function(d) {
          return '#' + d.id;
        })
        .append('path')
          .attr('class', 'area state')
          .attr('d', path)
          .attr('fill', 'transparent');

    states.append('path')
      .attr('class', 'mesh')
      .datum(data.geo.states.mesh)
      .attr('d', path);

    states.selectAll('path.area')

    var width = 900;
    var height = 510;
    var margin = 0;
    svg.attr('viewBox', [
      -margin,
      -margin,
      width + margin,
      height + margin
    ].join(' '));

    var areas = map.selectAll('g.counties path.area')
      .attr('id', function(d) {
        return d.properties.FIPS;
      });

    areas.append('title')
      .text(function(d) {
        d.title = [d.properties.county, d.properties.state].join(', ');
        return d.title;
      });
  }

  /*
   * initialize the state maps
   */
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

    div.append('h3')
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
        .attr('d', path)
        .append('title')
          .text(function(d) {
            return d.title;
          });

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

    // see: <http://bl.ocks.org/shawnbot/9240915>
    var margin = 20;
    svg.attr('viewBox', function(d) {
      var bounds = path.bounds(d);
      var x = bounds[0][0];
      var y = bounds[0][1];
      var w = bounds[1][0] - x;
      var h = bounds[1][1] - y;
      var bbox = this.getBoundingClientRect();
      var scale = Math.max(w, h) / Math.min(bbox.width, bbox.height);
      var m = margin * scale;
      return [x - m, y - m, w + m * 2, h + m * 2].join(' ');
    });
  }

  /*
   * update the overview map
   */
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

  /*
   * update the state maps
   */
  function updateStateMaps() {
    // XXX
  }

  /*
   * parse a single row of the revenue dataset by converting its revenue
   * column into a number and adding its commodity and year values to the
   * respective unique sets.
   */
  function parseRevenue(d) {
    data.commodities.add(d.Commodity);
    data.years.add(d.CY);
    d.revenue = parseDollars(d['Royalty/Revenue']);
    return d;
  }

  /*
   * parse dollar amount strings into numbers:
   *
   * parseDollars(' $ 50.0 ') === 50
   * parseDollars(' $ (100.0) ') === -100
   */
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

  // format a number back into its dollar form
  var formatDecimal = d3.format(',.2f');
  function formatDollars(num) {
    return '$' + formatDecimal(num);
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
