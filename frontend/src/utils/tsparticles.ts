import type { Engine } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { loadPolygonMaskPlugin } from '@tsparticles/plugin-polygon-mask';

let initialized = false;

export async function initParticles(engine: Engine): Promise<void> {
  if (initialized) return;

  await loadSlim(engine);
  await loadPolygonMaskPlugin(engine);
  initialized = true;
}