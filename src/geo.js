export const STATE_MAP = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
};

export function normalizeState(sourceState, sourceCity = '') {
  let maybeState = sourceState.trim();
  let maybeCity = sourceCity.trim();
  if (!maybeState) return '';

  // If city includes "Washington DC" or variant => "DC"
  if (maybeCity) {
    const cityLower = maybeCity.toLowerCase();
    if (cityLower.includes('washington') && (cityLower.includes('dc') || cityLower.includes('d.c'))) {
      return 'DC';
    }
  }
  // If we have a known US state name => 2-letter
  if (STATE_MAP[maybeState]) return STATE_MAP[maybeState];

  return maybeState;
}