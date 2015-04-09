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

  var DIVERGENT_COLORS = d3.set([
    'PuOr',
    'BrBG',
    'PRGn',
    'PiYG',
    'RdBu',
    'RdGy',
  ]);

  // initial app state
  var state = {
    breaks: 11,
    colors: 'BrBG',
    commodity: 'Oil & Gas'
  };

  var masonry;

  // colorbrewer color schemes -> <select>
  d3.select('select[name="colors"]')
    .selectAll('option')
      .data(Object.keys(colorbrewer)
        .filter(function(k) {
          // only match schemes with 11 colors and exclude the ugly ones
          return colorbrewer[k][11]
             && !k.match(/^(Dark|Set|Paired|Pastel|Accent)/);
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
      .data([3, 4, 5, 7, 9, 11])
      .enter()
      .append('option')
        .text(identity);

  // save state in the form
  var form = new formdb.Form('#controls')
    .setData(state);

  status.text('Loading...');

  // load everything!
  queue()
    .defer(d3.json, 'data/us-topology.json')
    // .defer(d3.csv, 'data/states.csv')
    .defer(d3.tsv, 'data/county-revenues.tsv')
    .await(function onload(error, topology, revenues) {
      status.text('Loaded, prepping data...');

      // stash these for use later
      data.geo.topology = topology;

      data.geo.counties = meshify(topology, 'counties');
      data.geo.states = meshify(topology, 'states');

      // save this, too, so we can look at it in the console
      data.revenues = revenues;

      var sums = [];
      // the index: year -> commodity -> FIPS
      data.index = d3.nest()
        .key(getter('year'))
        .key(getter('commodity'))
        .key(getter('FIPS'))
        .rollup(function(d) {
          var sum = d.length > 1
            ? d3.sum(d, getter('revenue'))
            : d.revenue;
          sums.push(sum);
          return sum;
        })
        .map(revenues);

      data.extent = d3.extent(sums);
      console.log('extent:', data.extent);

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
      var years = Object.keys(data.index)
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
        return d.counties = countiesByState[d.id] || [];
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

    var chart = div.append('div')
      .attr('class', 'bars');

    var mark = chart.selectAll('.mark')
      .data(function(d) {
        // XXX DC doesn't have counties
        return countiesByState[d.id] || [];
      })
      .enter()
      .append('div')
        .attr('class', 'mark county');

    mark.append('span')
      .attr('class', 'title')
      .text(function(d) { return d.properties.county; });

    mark.append('div')
      .attr('class', 'bar')
      .append('span')
        .attr('class', 'value');
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
        d.sum = index[d.properties.FIPS];
        return hasSum(d);
      })
      .classed('empty', false)
      .classed('full', true);

    var validData = areas.data();
    var zeroSum = function(d) { return !hasSum(d); };
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

      var sums = validData.map(function(d) { return d.sum; });
      var localExtent = d3.extent(sums);
      var extent = localExtent; // data.extent;

      var scale = createDivergentScale(extent, state.colors, state.breaks);
      var colors = scale.range();

      var fill = function(d) {
        return scale(d.sum);
      };
      areas.attr('fill', fill);

      d3.selectAll('#states g.counties path.area')
        .classed('empty', true)
        .classed('full', false)
        .filter(hasSum)
        .classed('empty', false)
        .classed('full', true)
        .attr('fill', fill);

      var charts = d3.selectAll('#states .bars');
      var marks = charts.selectAll('.mark')
        .style('display', function(d) {
          return hasSum(d) ? null : 'none';
        })
        .filter(hasSum)
        .sort(function(a, b) {
          return d3.descending(a.sum, b.sum);
        });

      marks.select('.value')
        .attr('data-value', function(d) { return d.sum; })
        .html(function(d) {
          return formatDollars(d.sum);
        });

      var width = createSizeScale(localExtent);
      marks.select('.bar')
        .style('background', fill)
        .style('width', function(d) {
          d._width = +width(d.sum).toFixed(1);
          return Math.abs(d._width) + '%';
        })
        .classed('negative', function(d) {
          return d.sum < 0;
        })
        .style('margin-left', function(d) {
          return d.sum < 0 ? (-Math.abs(d._width) + '%') : null;
        });

      var steps = colors
        .map(function(color) {
          var domain = scale.invertExtent(color);
          if (domain[1] < 0 && domain[1] > -1) {
            domain[1] = 0;
          }
          return {
            color: color,
            min: domain[0],
            max: domain[1]
          };
        })
        .reverse();

      var item = legend.selectAll('.item')
        .data(steps);
      item.exit().remove();

      var enter = item.enter().append('div')
        .attr('class', 'item');
      enter.append('span')
        .attr('class', 'color');
      enter.append('span')
        .attr('class', 'label');

      item.select('.color')
        .style('background', function(d) { return d.color; });
      item.select('.label')
        .html(function(d) {
          return d.min >= 0
            ? '&ge; ' + formatDollars(d.min)
            : '&le; ' + formatDollars(d.max);
        });

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

  function createDivergentScale(extent, scheme, breaks) {
    var min = extent[0];
    var max = extent[1];
    min = Math.min(min, -max);
    max = Math.max(max, -min);

    var colors = colorbrewer[scheme][breaks];
    var cutoff = Math.floor(breaks / 2);
    var left = colors.slice(0, cutoff);
    var right = colors.slice(cutoff);

    var negative = d3.scale.quantize()
      .domain([min, 0])
      .range(left);
    var positive = d3.scale.quantize()
      .domain([0, max])
      .range(right);

    var scale = function(x) {
      return x < 0
        ? negative(x)
        : positive(x);
    };

    scale.negative = negative;
    scale.positive = positive;

    scale.invert = function(y) {
      return y < 0
        ? negative.invert(y)
        : positive.invert(y);
    };

    scale.invertExtent = function(y) {
      return colors.indexOf(y) < cutoff
        ? negative.invertExtent(y)
        : positive.invertExtent(y);
    };

    scale.domain = function() {
      return [min, max];
    };

    scale.range = function() {
      return colors.slice();
    };

    return scale;
  }

  function createSizeScale(extent, size) {
    if (!size) size = 100;
    var max = extent[1];
    var min = Math.min(extent[0], -max);
    return d3.scale.linear()
      .domain([min, 0, max])
      .range([-size, 0, size])
      .clamp(true);
  }

  /*
   * update the state maps
   */
  function updateStateMaps() {
    // do this in a rAF() so the rendering thread isn't blocked
    requestAnimationFrame(function() {
      var states = d3.selectAll('#states .state')
        .each(function(d) {
          d._size = d.counties.filter(hasSum).length;
        })
        .attr('data-size', function(d) {
          return d._size;
        })
        .sort(function(a, b) {
          return d3.descending(a._size, b._size);
        });

      map.selectAll('path.state.area')
        .classed('empty', function(d) {
          return d._size === 0;
        });

      if (masonry) {
        masonry.layout();
      } else {
        masonry = new Masonry('#states', {
          columnWidth: 300,
          gutter: 40,
          itemSelector: '.state',
          transitionDuration: 0
        });
      }
    });
  }

  function hasSum(d) {
    return !isNaN(d.sum);
  }

  // format a number back into its dollar form
  var formatDecimal = d3.format('$,.2s');
  var suffixMap = {M: 'm', G: 'b', P: 't'};
  function formatDollars(num) {
    return formatDecimal(num)
      .replace(/\.0+$/, '')
      .replace(/[kMGP]$/, function(suffix) {
        return suffixMap[suffix] || suffix;
      });
  }

  function getter(key) {
    return typeof key === 'function'
      ? key
      : key
        ? function(d) { return d[key]; }
        : identity;
  }

  function identity(d) {
    return d;
  }

  exports.createDivergentScale = createDivergentScale;
  exports.formatDollars = formatDollars;

  exports.data = data;

})(window);
