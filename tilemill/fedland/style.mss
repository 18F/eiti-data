@color1: #B9D2B1;
@color2: #DDB2A1;
@color3: #C4BFA2;
@color4: #F1D6B8;
@color5: #C1D0FF;

Map {
  background-color: #b8dee6;
}

#countries {
  line-color: #999;
  line-width: 1.5;
  line-join: round;
  polygon-fill: #fff;
}

#fedland {
  line-color: @color1;
  line-width: 1;
  polygon-opacity: 1;
  polygon-fill: @color1;
  
  [AGBUR="BLM"],
  [FEATURE1="National Wild and Scenic River BLM"],
  [FEATURE1="Public Domain Land BLM"],
  [FEATURE1="National Conservation Area BLM"],
  [FEATURE1="Other BLM"] {
    polygon-fill: @color2;
    line-color: @color2;
  }
  
  [FEATURE1="National Wildlife Refuge FWS"] {
    polygon-fill: @color3;
    line-color: @color3;
  }
  
  [FEATURE1="National Monument NPS"],
  [FEATURE1="National Park NPS"],
  [FEATURE1="National Preserve NPS"],
  [FEATURE1="Wilderness NPS"] {
    polygon-fill: @color4;
    line-color: @color4;
  }
  
  [FEATURE1="Army DOD"],
  [FEATURE1="Air Force DOD"] {
    polygon-fill: @color5;
    line-color: @color5;
  }
}
