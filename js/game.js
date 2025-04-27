/*
File: js/game.js
Description: Three.js game logic with accelerometer steering
*/

import * as THREE from 'three';
let scene, camera, renderer, loader;
let gorilla, bridge;
let clock = new THREE.Clock();
let levelTime = 30; // seconds, adjust per level
let levelStart;
let tiltX = 0;

init();
animate();
registerServiceWorker();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, -5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  // Ground and bridge
  createBridge();

  // Load Gorilla model (add assets/gorilla.glb)
  loader = new THREE.GLTFLoader();
  loader.load("assets/gorilla.glb", (gltf) => {
    gorilla = gltf.scene;
    gorilla.scale.set(0.5, 0.5, 0.5);
    scene.add(gorilla);
    gorilla.position.set(0, 0, 0);
  });

  // Device orientation for steering
  window.addEventListener("deviceorientation", onTilt, true);

  window.addEventListener("resize", onWindowResize, false);

  startLevel();
}

function createBridge() {
  const bridgeGroup = new THREE.Group();
  const plankGeometry = new THREE.BoxGeometry(1.2, 0.1, 3);
  const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

  const gap = 0.5;
  const count = 30;
  for (let i = 0; i < count; i++) {
    const plank = new THREE.Mesh(plankGeometry, plankMaterial);
    plank.position.set(0, 0, i * (3 + gap));
    bridgeGroup.add(plank);
  }
  scene.add(bridgeGroup);
  bridge = bridgeGroup;
}
function onTilt(event) {
  // gamma is left-to-right tilt [-90,90]
  tiltX = THREE.MathUtils.clamp(event.gamma / 45, -1, 1);
}
function startLevel() {
  levelStart = clock.getElapsedTime();
}
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime() - levelStart;
  if (elapsed >= levelTime) {
    nextLevel();
  }

  // Move gorilla forward
  if (gorilla) {
    gorilla.position.z += 0.05;
    // Steering
    gorilla.position.x = tiltX * 2;
    camera.position.x = gorilla.position.x;
    camera.position.z = gorilla.position.z - 5;
    camera.lookAt(gorilla.position.x, gorilla.position.y, gorilla.position.z);
  }

  renderer.render(scene, camera);
}

function nextLevel() {
  levelTime = Math.min(120, levelTime + 15); // increase up to 2min
  scene.remove(bridge);
  createBridge();
  gorilla.position.set(0, 0, 0);
  startLevel();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.error("SW registration failed:", err));
  }
}
