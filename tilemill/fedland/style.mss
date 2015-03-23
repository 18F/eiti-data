@color1: #B1C9A9;
@color2: #DDB2A1;
@color3: #BCB89C;
@color4: #EAD0B2;
@color5: #ECCDF2;
@darken: .9;

Map {
  background-color: #b8dee6;
}

#countries {
  polygon-fill: #eee;
  
  [ADM0_A3="USA"] {
    polygon-fill: #fff;
  }
}

#fedland {
  line-color: @color1;
  line-width: 1;
  polygon-opacity: .9;
  polygon-fill: @color1;

  [AGBUR="BLM"] {
    polygon-fill: @color2;
    polygon-opacity: 1;
    line-color: darken(@color2, @darken);
  }
  
  [AGBUR="FWS"] {
    polygon-fill: @color3;
    polygon-opacity: 1;
    line-color: darken(@color3, @darken);
  }
  
  [AGBUR="NPS"] {
    polygon-fill: @color4;
    polygon-opacity: 1;
    line-color: darken(@color4, @darken);
  }
  
  [AGBUR="DOD"] {
    polygon-fill: @color5;
    polygon-opacity: 1;
    line-color: darken(@color5, @darken);
  }
}
