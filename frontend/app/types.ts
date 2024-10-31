export type RezonedParcel = {
  blklot: string;
  nearby_height: number;
  new_zoned_height: number;
  added_capacity: number;
};

export const AllNhoods = [
  "Western Addition",
  "West of Twin Peaks",
  "Visitacion Valley",
  "Twin Peaks",
  "South of Market",
  "Presidio Heights",
  "Potrero Hill",
  "Portola",
  "Pacific Heights",
  "Outer Richmond",
  "Outer Mission",
  "Sunset/Parkside",
  "Oceanview/Merced/Ingleside",
  "North Beach",
  "Noe Valley",
  "Lone Mountain/USF",
  "Lincoln Park",
  "Seacliff",
  "Nob Hill",
  "Mission Bay",
  "Mission",
  "Russian Hill",
  "Marina",
  "Lakeshore",
  "Tenderloin",
  "McLaren Park",
  "Japantown",
  "Inner Sunset",
  "Hayes Valley",
  "Haight Ashbury",
  "Inner Richmond",
  "Glen Park",
  "Financial District/South Beach",
  "Excelsior",
  "Chinatown",
  "Castro/Upper Market",
  "Bernal Heights",
  "Bayview Hunters Point",
  // We have some data cleaning to do here
  // "Treasure Island",
  // Don't worry we're not coming for your parks
  // "Golden Gate Park",
  // "Presidio",
];
