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
import { isIOS, isTouchScreen } from './utils';
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
const tiltSensitivity = 0.5;
const tiltSmoothing = 0.1;
let debugText: HTMLDivElement;
let score = 0;
let scoreText: HTMLDivElement;
let maxZ = 0;
let highScore = 0;
let bridgeEndZ = 0;

const BASE_SPEED = 0.20;
const SPEED_GROWTH_FACTOR = 0.0005;
const MAX_SPEED = 1.0;

let falling = false;
let fallVelocity = 0;
const GRAVITY = 0.02;
const PLANK_WIDTH = 1.2;
const PLANK_LENGTH = 3;
const PLANK_GAP = 0.5;
const PLANK_COUNT = 30;

let jumping = false;
let jumpVelocity = 0;
const JUMP_VELOCITY = 0.25;
const JUMP_GRAVITY = 0.018;
const JUMP_Y = 0.45;
const JUMP_THRESHOLD = 0.1; // m/s^2 upward acceleration

const BASE_SCALE = 0.4;
const GROWTH_FACTOR = 0.0003;
const MAX_SCALE = 2;


createMotionVisualization(); //
init();
animate();
registerServiceWorker();
// Remove the demoContainer.innerHTML assignment

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

    // Create score text element
    scoreText = document.createElement('div');
    scoreText.style.position = 'absolute';
    scoreText.style.top = '10px';
    scoreText.style.right = '10px';
    scoreText.style.color = 'yellow';
    scoreText.style.fontFamily = 'Arial';
    scoreText.style.fontSize = '20px';
    scoreText.style.backgroundColor = 'rgba(0,0,0,0.5)';
    scoreText.style.padding = '5px 12px';
    scoreText.style.borderRadius = '5px';
    scoreText.style.fontWeight = 'bold';
    scoreText.textContent = 'Score: 0';
    document.body.appendChild(scoreText);

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

    loader.load('dragon/dragon.glb', (gltf: GLTF) => {
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

            },
            true,
        );
    }
    window.addEventListener('resize', onWindowResize, false);

    startLevel();
}


function createBridge(): void {
    const bridgeGroup = new THREE.Group();
    const plankGeometry = new THREE.BoxGeometry(1.2, 0.1, 3);

    const gap = 0;
    const count = PLANK_COUNT;
    // Define a variety factor to control how much the planks can deviate horizontally
    const variety = 0.2; // Higher values = more random placement

    for (let i = 0; i < count; i++) {
        // random colors
        const randomColor = Math.random() * 0xffffff;
        let material = new THREE.MeshStandardMaterial({ color: randomColor });
        const plank = new THREE.Mesh(plankGeometry, material);
        // Random horizontal offset based on variety factor
        const randomOffset = (Math.random() * 2 - 1) * variety;
        plank.position.set(randomOffset, 0, i * (3 + gap));
        bridgeGroup.add(plank);
    }

    scene.add(bridgeGroup);
    bridge = bridgeGroup;
    // Calculate the end Z of the bridge
    bridgeEndZ = (count - 1) * (PLANK_LENGTH + PLANK_GAP) + PLANK_LENGTH / 2;
}

function onTilt(event: DeviceMotionEvent): void {
    debugText.textContent = "tilt start"
    if (event.accelerationIncludingGravity) {
        const { x } = event.accelerationIncludingGravity;

        if (!x) {
            debugText.textContent = "Tilt sensors not working";
            return;
        }



        // Normalize the tilt value and apply smoothing
        const targetTilt = THREE.MathUtils.clamp(-x * tiltSensitivity, -1, 1);
        tiltX = lastTiltX + (targetTilt - lastTiltX) * tiltSmoothing;
        lastTiltX = tiltX;
    } else {
        debugText.textContent = "Device motion data not available";
    }

    // Detect jump (kick up)
    if (
        event.accelerationIncludingGravity &&
        !jumping && !falling && mainUser &&
        event.accelerationIncludingGravity.y !== null &&
        event.accelerationIncludingGravity.y > JUMP_THRESHOLD
    ) {
        jumping = true;
        jumpVelocity = JUMP_VELOCITY;
        debugText.textContent = 'Jump!';
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

    if (mainUser) {
        // Check if user reached the end of the bridge
        if (!falling && mainUser.position.z >= bridgeEndZ) {
            // Update high score if needed
            if (score > highScore) {
                highScore = score;
            }
            scoreText.textContent = `Bridge Complete! High Score: ${highScore}`;
            debugText.textContent = 'Restarting...';
            setTimeout(() => {
                mainUser!.position.set(0, 0.45, 0);
                falling = false;
                fallVelocity = 0;
                maxZ = 0;
                score = 0;
                scoreText.textContent = 'Score: 0';
                startLevel();
            }, 2000);
            return;
        }
        if (!falling && mainUser.position.z < bridgeEndZ) {
            const currentSpeed = Math.min(BASE_SPEED + mainUser.position.z * SPEED_GROWTH_FACTOR, MAX_SPEED);
            mainUser.position.z += currentSpeed;
            mainUser.position.x = THREE.MathUtils.lerp(
                mainUser.position.x,
                tiltX * 2,
                0.1
            );
            // Grow user as they move forward
            const newScale = Math.min(BASE_SCALE + mainUser.position.z * GROWTH_FACTOR, MAX_SCALE);
            mainUser.scale.set(newScale, newScale, newScale);
            // Jumping logic
            if (jumping) {
                mainUser.position.y += jumpVelocity;
                jumpVelocity -= JUMP_GRAVITY;
                if (mainUser.position.y <= JUMP_Y) {
                    mainUser.position.y = JUMP_Y;
                    jumping = false;
                    jumpVelocity = 0;
                    debugText.textContent = 'Landed!';
                }
            } else {
                mainUser.position.y = JUMP_Y;
            }
            // Only fall if too far left or right (but not at the end)
            if (Math.abs(mainUser.position.x) > PLANK_WIDTH / 2) {
                falling = true;
                fallVelocity = 0;
                debugText.textContent = 'Falling (off the side)!';
            }
            // Update score based on farthest Z position
            if (mainUser.position.z > maxZ) {
                maxZ = mainUser.position.z;
                score = Math.floor(maxZ);
                scoreText.textContent = `Score: ${score}`;
            }
        } else if (falling) {
            // Animate falling
            fallVelocity += GRAVITY;
            mainUser.position.y -= fallVelocity;
            debugText.textContent = 'Falling! Y=' + mainUser.position.y.toFixed(2);
            if (mainUser.position.y < -5) {
                debugText.textContent = 'You fell! Resetting...';
                setTimeout(() => {
                    mainUser!.position.set(0, JUMP_Y, 0);
                    falling = false;
                    fallVelocity = 0;
                    maxZ = 0;
                    score = 0;
                    scoreText.textContent = 'Score: 0';
                    startLevel();
                }, 1000);
            }
        }
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
        mainUser.position.set(0, 0.45, 0);
        maxZ = 0;
        score = 0;
        scoreText.textContent = 'Score: 0';
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

function createMotionVisualization() {
    const demoContainer = document.createElement('div');
    demoContainer.className = 'demo-container';
    document.body.appendChild(demoContainer);

    // const ball = document.createElement('div');
    // ball.id = 'motion-ball';
    // demoContainer.appendChild(ball);

    const startButton = document.createElement('button');
    startButton.id = 'start-motion';
    startButton.textContent = 'Start Motion';
    startButton.style.width = "100%"
    demoContainer.appendChild(startButton);
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

//  Add this to create the ball element

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

        //@ts-ignore
        startButton.disabled = true;
        startButton.style.display = "none";
    } catch (error) {
        console.error('Error accessing motion sensors:', error);
    }
});

