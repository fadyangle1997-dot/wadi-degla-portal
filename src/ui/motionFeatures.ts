/**
 * Motion's animation engine, loaded after first paint. Components render with
 * the lightweight `m` elements; LazyMotion in main.tsx fetches this chunk.
 * domAnimation covers animate/exit/variants/gestures — the app uses no layout
 * animations, so the heavier domMax is not needed.
 */
export { domAnimation as default } from 'motion/react';
