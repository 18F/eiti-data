Map {
  background-color: #b8dee6;
}

#countries {
  ::outline {
    line-color: #85c5d3;
    line-width: 2;
    line-join: round;
  }
  polygon-fill: #fff;
}

.offshore {
  line-color: #594;
  line-width: 0.5;
  polygon-opacity: 1;
  polygon-fill: #ae8;
  
  ::label {
    text-name: [MMS_PLAN_A];
    [TEXT_LABEL!=''] {
      text-name: [MMS_PLAN_A] + ' ' + [TEXT_LABEL];
    }
    text-face-name: 'DejaVu Sans Mono Book', Helvetica;
    text-fill: #333;
    text-line-spacing: 2;
    text-halo-fill: #fff;
    text-halo-radius: 1.5;
    text-wrap-width: 100;
    text-placement: interior;
    text-placement-type: simple;
    text-min-distance: 10;
    // text-avoid-edges: true;
    text-size: 12;
    
    [zoom>=6] { text-size: 14; }
    [zoom>=7] { text-size: 16; }
    [zoom>=8] { text-size: 18; }
    [zoom>=8] { text-size: 20; }
    [zoom>=9] { text-size: 22; }
    [zoom>=10] { text-size: 24; }    
  }
}
