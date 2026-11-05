// Names, craft categories and descriptions from website/scripts/seed-market.ts.
// These are project demo examples; no live stock, price or delivery promise is implied.
export const platformProducts = [
  { id: 'kilim', name: 'Wool kilim rug', craft: 'Weaving', description: 'Flat-woven wool rug in natural dyes.', image: '/platform/kilim.webp', alt: 'Multicolour geometric wool kilim rug from the NASJ project catalog' },
  { id: 'gift-basket', name: 'Woven gift basket', craft: 'Basket making', description: 'Natural fiber basket with handles, for gift sets.', image: '/platform/gift-basket.webp', alt: 'Natural woven gift basket with handles from the NASJ project catalog' },
  { id: 'ceramic-mug', name: 'Hand-painted mug', craft: 'Pottery', description: 'Handmade mug painted by hand.', image: '/platform/ceramic-mug.webp', alt: 'White mug with floral painted decoration from the NASJ project catalog' },
] as const;
