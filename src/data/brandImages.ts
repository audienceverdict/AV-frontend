/** Local AV artwork supplied with the prototype. Vite bundles these assets with the app. */
const localImage = (file: string) =>
  new URL(`../../images/${file}`, import.meta.url).href;

export const brandImages = [
  'WhatsApp Image 2026-09-28 at 1.38.05 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.38.07 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.38.08 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.17 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.19 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.22 PM (1).jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.22 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.41 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.43 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.44 PM (1).jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.44 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.45 PM (1).jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.45 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.46 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.47 PM (1).jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.47 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.48 PM (1).jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.48 PM.jpeg',
  'WhatsApp Image 2026-09-28 at 1.39.49 PM.jpeg',
].map(localImage);

export const heroBrandImage = brandImages[0];
export const feedbackBrandImage = brandImages[6];
export const landingImage = localImage('WhatsApp Image 2026-09-28 at 3.03.09 PM.jpeg');
export const loadingImage = localImage('WhatsApp Image 2026-09-28 at 1.39.49 PM.jpeg');
