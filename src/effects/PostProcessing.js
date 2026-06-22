import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Builds the render pipeline: scene → ambient occlusion → bloom → filmic output.
export function createComposer(renderer, scene, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);

  composer.addPass(new RenderPass(scene, camera));

  // Ambient occlusion — soft contact shadows that ground every object
  const ssao = new SSAOPass(scene, camera, w, h);
  ssao.kernelRadius = 6;
  ssao.minDistance = 0.0015;
  ssao.maxDistance = 0.08;
  composer.addPass(ssao);

  // Subtle bloom — only the brightest pixels (sky, emissives, muzzle flash) glow
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.5, 0.85);
  composer.addPass(bloom);

  // Tone mapping + sRGB conversion happens here
  composer.addPass(new OutputPass());

  composer._ssao = ssao;
  composer._bloom = bloom;
  return composer;
}

export function resizeComposer(composer, w, h) {
  composer.setSize(w, h);
  if (composer._ssao) composer._ssao.setSize(w, h);
  if (composer._bloom) composer._bloom.setSize(w, h);
}
