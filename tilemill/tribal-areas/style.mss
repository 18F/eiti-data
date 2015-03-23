Map {
  background-color: #b8dee6;
}

#countries {
  polygon-fill: #eee;
  
  [ADM0_A3="USA"] {
    polygon-fill: #fff;
  }
}


#tribal-lands {
  ::shape {
    line-opacity: 1;
    line-width: 1;
    line-color: #92cf83;
    polygon-opacity: 1;
    polygon-fill: #ae8;
  }
  
  [zoom>4] {
    ::text {
      text-name: [NAME];
      text-face-name: 'DejaVu Sans Mono Book';
      text-fill: #333;
      text-size: 10;
      text-line-spacing: 2;
      text-halo-fill: #fff;
      text-halo-radius: 1.5;
      text-wrap-width: 100;
      text-placement: interior;
      text-placement-type: simple;
      text-min-distance: 20;
      text-avoid-edges: true;
      
      [zoom>=6] { text-size: 12; }
      [zoom>=7] { text-size: 14; }
      [zoom>=8] { text-size: 16; }
      [zoom>=8] { text-size: 18; }
      [zoom>=9] { text-size: 20; }
      [zoom>=10] { text-size: 24; }
	}      
  }
}
