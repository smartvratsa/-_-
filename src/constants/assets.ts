/**
 * Central asset references with relative path resolution
 * Ensures assets work reliably across AI Studio, Cloud Run, and GitHub Pages (e.g. https://gab4o83.github.io/-_-/)
 */

export const LOGO_PATH = './logo.png';
export const LOGO_FALLBACK_PATH = './logo.jpg';
export const HERO_VIDEO_PATH = './assets/aistudio/videoUmnaWratsa_f4293ec3.mp4';

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc = LOGO_FALLBACK_PATH
) => {
  const target = e.currentTarget;
  if (!target.dataset.triedFallback) {
    target.dataset.triedFallback = 'true';
    target.src = fallbackSrc;
  }
};
