/**
 * MVP Game Description:
 *
 * Overview:
 * A 3D endless-style game where the player controls a user viewed from a third-person behind-the-back perspective.
 * The user automatically moves forward along a thin, plank-based wooden bridge suspended over a canyon.
 * The player must steer the user left and right using the mobile device's accelerometer to keep it safely on the planks.
 *
 * Core Mechanics:
 * - Auto-Forward Movement: user moves forward at a constant speed to challenge the player's reaction time.
 * - Tilt-Based Steering: Device tilt on the X-axis maps to lateral movement, allowing precise control within the bridge bounds.
 * - Bridge Generation: Each level spawns a sequence of evenly spaced planks with small gaps; falling between planks results in level failure.
 *
 * Objectives & Progression:
 * - Level Duration: Levels start at 30 seconds and increase by 15 seconds each time, up to a maximum of 2 minutes.
 * - Survival Goal: Stay on the bridge without falling off until the level timer reaches zero.
 * - Level Transition: Upon successful completion, the current bridge resets, difficulty remains constant (no speed increase), and the timer resets for the next level.
 *
 * User Interface:
 * - On-Screen Timer: Displays remaining level time.
 * - Level Indicator: Shows current level number.
 * - Simple HUD: Minimalist UI to avoid blocking view of the bridge.
 *
 * Art & Audio:
 * - Environment: Sky-blue background with basic lighting (hemisphere) for clarity.
 * - user: Placeholder GLB model with a simple PNG texture; no animations required for MVP.
 * - Sound: Optional simple ambient sound or chimes on level completion.
 *
 * PWA Requirements:
 * - Service Worker: Offline caching for assets.
 * - Responsive: Full-screen canvas layout adapts to mobile device orientation and resolution.
 */
import * as THREE from 'three';
import { isAndroidChrome, isAndroidEdge, isIOS, isTouchScreen } from './utils';
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
let lastTiltX = 0;
const tiltSensitivity = 0.1;
const tiltSmoothing = 0.1;
let debugText: HTMLDivElement;

init();
animate();
registerServiceWorker();

function init(): void {
    // Create debug text element
    debugText = document.createElement('div');
    debugText.style.position = 'absolute';
    debugText.style.top = '10px';
    debugText.style.left = '10px';
    debugText.style.color = 'white';
    debugText.style.fontFamily = 'Arial';
    debugText.style.fontSize = '16px';
    debugText.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugText.style.padding = '5px';
    debugText.style.borderRadius = '5px';
    document.body.appendChild(debugText);

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
    renderer.setSize(window.innerWidth - 15, window.innerHeight - 15);
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

    // DeviceMotionEvent.r
    // ondeviceorientation = (event) => {
    //     debugText.textContent = JSON.stringify(event)
    // };

    // Device motion for steering
    window.addEventListener('devicemotion', onTilt, true);
    // window.addEventListener('deviceorientationabsolute', (e) => {
    //     debugText.textContent = JSON.stringify("deviceorientationabsolute")
    // });
    // window.addEventListener('devicemotion', (e) => {
    //     debugText.textContent = 'devicemotion'
    // });

    // window.addEventListener('deviceorientation', (e) => {
    //     debugText.textContent = e.beta || "deviceorientation no beta"
    // });


    // request motion permission for iOS devices
    if (isIOS()) {
        window.addEventListener('deviceorientation', (event) => {
            if (event.alpha === null || event.beta === null || event.gamma === null) {
                debugText.textContent = "Device orientation data not available";
                return;
            }
            // Update debug text with orientation information
            // const beta = event.beta?.toFixed(2) || "N/A";  // Front-to-back tilt
            // const gamma = event.gamma?.toFixed(2) || "N/A"; // Left-to-right tilt
            // const alpha = event.alpha?.toFixed(2) || "N/A"; // Device compass direction
        }, true);
    }


    if (window.DeviceMotionEvent) {
        window.addEventListener(
            "devicemotion",
            (event) => {

                let frontToBack = event.accelerationIncludingGravity?.x;
                let leftToRight = event.accelerationIncludingGravity?.y;
                let rotateDegrees = event.rotationRate?.alpha;
                if (frontToBack === null || leftToRight === null || rotateDegrees === null) {
                    debugText.textContent = "Device motion data not available";
                    return;
                }
                // Update debug text with tilt information
                debugText.textContent = `Tilt X: ${frontToBack?.toFixed(2)}\nTilt Value: ${leftToRight?.toFixed(2)}`;
                // Normalize the tilt value and apply smoothing
                // const targetTilt = THREE.MathUtils.clamp(frontToBack * tiltSensitivity, -1, 1);
                // tiltX = lastTiltX + (targetTilt - lastTiltX) * tiltSmoothing;

                // handleOrientationEvent(frontToBack, leftToRight, rotateDegrees);
            },
            true,
        );
    }

    // const handleOrientationEvent = (frontToBack, leftToRight, rotateDegrees) => {
    //     // do something amazing
    //     // debugText.textContent(JSON.stringify({ frontToBack, leftToRight, rotateDegrees }))
    // };

    //     window.addEventListener("deviceorientation", (event) => {
    //         if (event && event.beta !== null && event.gamma !== null) {
    //             // Update debug text with orientation information
    //             const beta = event.beta?.toFixed(2) || "N/A";  // Front-to-back tilt
    //             const gamma = event.gamma?.toFixed(2) || "N/A"; // Left-to-right tilt
    //             const alpha = event.alpha?.toFixed(2) || "N/A"; // Device compass direction

    //             // Append orientation data to debug text
    //             debugText.textContent = `${debugText.textContent || ""}
    // Orientation:
    // Alpha (compass): ${alpha}°
    // Beta (front/back): ${beta}°
    // Gamma (left/right): ${gamma}°`;
    //         } else {
    //             debugText.textContent = `${debugText.textContent || ""}
    // Orientation sensors not available`;
    //         }

    //     });

    // startSensors()

    window.addEventListener('resize', onWindowResize, false);

    startLevel();
}

// function startSensors() {
//     if (iOS()) {
//         DeviceOrientationEvent.requestPermission()
//             .then((response) => {
//                 if (response === "granted") {
//                     window.addEventListener("deviceorientation", handler, true);
//                 } else {
//                     alert("has to be allowed!");
//                 }
//             })
//             .catch(() => alert("not supported"));
//     } else {
//         window.addEventListener("deviceorientationabsolute", handler, true);
//     }
// }


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

function onTilt(event: DeviceMotionEvent): void {
    debugText.textContent = "tilt start"
    if (event.accelerationIncludingGravity) {
        const { x } = event.accelerationIncludingGravity;

        debugText.textContent = (JSON.stringify(event.accelerationIncludingGravity))
        if (!x) {
            debugText.textContent = "Tilt sensors not working";
            return;
        }

        // Update debug text with tilt information
        debugText.textContent = `Tilt X: ${x.toFixed(2)}\nTilt Value: ${tiltX.toFixed(2)}`;

        // Normalize the tilt value and apply smoothing
        const targetTilt = THREE.MathUtils.clamp(-x * tiltSensitivity, -1, 1);
        tiltX = lastTiltX + (targetTilt - lastTiltX) * tiltSmoothing;
        lastTiltX = tiltX;
    } else {
        debugText.textContent = "Device motion data not available";
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
        // Steering with smoother movement
        mainUser.position.x = THREE.MathUtils.lerp(
            mainUser.position.x,
            tiltX * 2,
            0.1
        );
        camera.position.x = mainUser.position.x;
        camera.position.z = mainUser.position.z - 5;
        camera.lookAt(mainUser.position.x, mainUser.position.y, mainUser.position.z);

        // Update debug text with position information
        // debugText.textContent = `\nPosition: (${mainUser.position.x.toFixed(2)}, ${mainUser.position.y.toFixed(2)}, ${mainUser.position.z.toFixed(2)})`;
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





// test

const createMotionVisualization = () => {
    const demoContainer = document.createElement('div');
    demoContainer.className = 'demo-container';
    document.body.appendChild(demoContainer);

    const ball = document.createElement('div');
    ball.id = 'motion-ball';
    demoContainer.appendChild(ball);

    const startButton = document.createElement('button');
    startButton.id = 'start-motion';
    startButton.textContent = 'Start Motion';
    demoContainer.appendChild(startButton);
};

const handleMotion = (event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity, rotationRate, interval } = event;
    const ball = document.getElementById('motion-ball');

    // Update ball position based on acceleration
    //@ts-ignore
    const x = accelerationIncludingGravity.x * 2;
    //@ts-ignore
    const y = accelerationIncludingGravity.y * 2;
    //@ts-ignore
    ball.style.transform = `translate(${x}px, ${y}px)`;

    // Update numerical readouts
    //@ts-ignore
    document.getElementById('accel-x').textContent = accelerationIncludingGravity.x.toFixed(2);

    //@ts-ignore
    document.getElementById('accel-y').textContent = accelerationIncludingGravity.y.toFixed(2);
    //@ts-ignore
    document.getElementById('accel-z').textContent = accelerationIncludingGravity.z.toFixed(2);
    //@ts-ignore
    document.getElementById('rotation-alpha').textContent = rotationRate?.alpha?.toFixed(2) || '0.00';
    //@ts-ignore
    document.getElementById('rotation-beta').textContent = rotationRate?.beta?.toFixed(2) || '0.00';
    //@ts-ignore
    document.getElementById('rotation-gamma').textContent = rotationRate?.gamma?.toFixed(2) || '0.00';
};

const detectShake = (event: DeviceMotionEvent) => {
    const { acceleration } = event;
    const threshold = 15; // Adjust sensitivity

    const totalAcceleration = Math.sqrt(
        //@ts-ignore
        acceleration.x ** 2 +
        //@ts-ignore
        acceleration.y ** 2 +
        //@ts-ignore
        acceleration.z ** 2
    );

    if (totalAcceleration > threshold) {
        document.body.classList.add('shake-detected');
        setTimeout(() => document.body.classList.remove('shake-detected'), 500);
    }
};

const supported = 'DeviceMotionEvent' in window && isTouchScreen();
const noSensorPermission = supported && !('requestPermission' in DeviceMotionEvent);

// Remove the demoContainer.innerHTML assignment
createMotionVisualization(); // Add this to create the ball element

// Keep the event listeners for buttons that now exist in the template
const startButton = document.getElementById('start-motion');

//@ts-ignore
startButton?.addEventListener('click', async () => {
    try {
        //@ts-ignore
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            //@ts-ignore
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') return;
        }

        window.addEventListener('devicemotion', handleMotion);
        window.addEventListener('devicemotion', detectShake);
        //@ts-ignore
        startButton.disabled = true;
    } catch (error) {
        console.error('Error accessing motion sensors:', error);
    }
});


