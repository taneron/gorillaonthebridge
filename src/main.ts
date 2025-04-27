import * as THREE from 'three';
// import { GLTFLoader } from './loader';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let loader: GLTFLoader;
let textureLoader: THREE.TextureLoader;
let mainUser: THREE.Group | null = null;
let bridge: THREE.Group;
const clock = new THREE.Clock();
let levelTime = 30; // seconds, adjust per level
let levelStart = 0;
let tiltX = 0;

init();
animate();
registerServiceWorker();

function init(): void {
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

    // Load mainUser model (add assets/mainUser.glb)
    loader = new GLTFLoader();
    textureLoader = new THREE.TextureLoader();

    loader.load('models/dragon/dragon.glb', (gltf: GLTF) => {
        textureLoader.load('assets/skin_texture.png', (texture) => {
            mainUser!.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((mat) => {
                            (mat as THREE.MeshStandardMaterial).map = texture;
                            (mat as THREE.MeshStandardMaterial).needsUpdate = true;
                        });
                    } else {
                        const mat = mesh.material as THREE.MeshStandardMaterial;
                        mat.map = texture;
                        mat.needsUpdate = true;
                    }
                }
            });
        });

        mainUser = gltf.scene;
        mainUser.scale.set(0.5, 0.5, 0.5);
        scene.add(mainUser);
        mainUser.position.set(0, 0, 0);
    });

    // Device orientation for steering
    window.addEventListener('deviceorientation', onTilt, true);

    window.addEventListener('resize', onWindowResize, false);

    startLevel();
}

function createBridge(): void {
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

function onTilt(event: DeviceOrientationEvent): void {
    if (event.gamma !== null) {
        tiltX = THREE.MathUtils.clamp(event.gamma / 45, -1, 1);
    }
}

function startLevel(): void {
    levelStart = clock.getElapsedTime();
}

function animate(): void {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime() - levelStart;
    if (elapsed >= levelTime) {
        nextLevel();
    }

    // Move mainUser forward
    if (mainUser) {
        mainUser.position.z += 0.05;
        // Steering
        mainUser.position.x = tiltX * 2;
        camera.position.x = mainUser.position.x;
        camera.position.z = mainUser.position.z - 5;
        camera.lookAt(mainUser.position.x, mainUser.position.y, mainUser.position.z);
    }

    renderer.render(scene, camera);
}

function nextLevel(): void {
    levelTime = Math.min(120, levelTime + 15); // increase up to 2min
    scene.remove(bridge);
    createBridge();
    if (mainUser) {
        mainUser.position.set(0, 0, 0);
    }
    startLevel();
}

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch((err) => console.error('SW registration failed:', err));
    }
}
