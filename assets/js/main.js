import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

// Scene setup
const canvas = document.getElementById("c");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 40, 160);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 60;
controls.maxDistance = 600;

// Lights
const ambient = new THREE.HemisphereLight(0xffffff, 0x080820, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xfff7e7, 0.9);
dir.position.set(50, 100, 50);
scene.add(dir);

// Loaders
const loader = new THREE.TextureLoader();
const fontLoader = new FontLoader();

// Modules (simple implementations inline to avoid many files)
// Planet factory
function createPlanet() {
    const planetGroup = new THREE.Group();

    // Base sphere
    const geo = new THREE.SphereGeometry(36, 72, 72);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xcc6a3a,
        metalness: 0.1,
        roughness: 0.7,
        emissive: 0x220000,
        emissiveIntensity: 0.05,
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.name = "planet";
    planetGroup.add(sphere);

    // cloud layer - slightly larger with transparent clouds texture
    const cloudTex = loader.load("./assets/images/clouds.png");
    const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
    });
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(36.6, 72, 72), cloudMat);
    planetGroup.add(cloud);

    // rim glow - emissive donut via sprite
    const rim = new THREE.Mesh(
        new THREE.RingGeometry(37.6, 44, 64),
        new THREE.MeshBasicMaterial({ color: 0xffb077, side: THREE.DoubleSide, transparent: true, opacity: 0.08 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.z = -2;
    planetGroup.add(rim);

    // volcano spawn points (local positions on sphere)
    const volcanoPoints = [
        new THREE.Vector3(10, -12, 32),
        new THREE.Vector3(-18, -8, 30),
        new THREE.Vector3(20, 2, -28),
    ];

    planetGroup.userData = { sphere, cloud, volcanoPoints };
    return planetGroup;
}

// Stars
function createStars() {
    const starsGeo = new THREE.BufferGeometry();
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const r = 600 * Math.random() + 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        positions[i * 3 + 2] = Math.cos(phi) * r;
        sizes[i] = Math.random() * 0.1 + 0.1;
    }

    starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starsGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const starTex = loader.load("./assets/images/star.png");

    const starsMat = new THREE.PointsMaterial({
        size: 4,
        map: starTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starsGeo, starsMat);

    // ★ Shimmer animation
    gsap.to(starsMat, {
        opacity: 0.3,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
    });

    return stars;
}

// Moons factory
function createMoon(radius = 6, color = 0xffffff) {
    const g = new THREE.SphereGeometry(radius, 32, 32);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    return new THREE.Mesh(g, m);
}

// Orbiting text
async function createOrbitText(logoWord = "UNIVERSE", spacing = 0.75) {
    return new Promise((resolve) => {
        fontLoader.load("https://threejs.org/examples/fonts/helvetiker_regular.typeface.json", (font) => {
            const group = new THREE.Group();

            const radius = 105; // orbit radius
            const verticalTilt = 0.25; // ring tilt (controls Y wave)
            // spacing used below to control angular coverage
            // clamp spacing to reasonable range to avoid degenerate cases
            spacing = 0.15;

            const chars = logoWord.toUpperCase().split("");
            // total angular coverage (radians) = 2π * spacing
            const totalAngle = Math.PI * 2 * spacing;
            // step between characters based on that coverage
            const step = totalAngle / chars.length;
            // center the ring so letters are centered around angle 0
            const startAngle = -totalAngle / 2;

            chars.forEach((ch, i) => {
                const geo = new TextGeometry(ch, {
                    font,
                    size: 9,
                    height: 1,
                });

                // center geometry so lookAt works as expected
                geo.center();

                const mat = new THREE.MeshStandardMaterial({
                    color: 0xfff3d0,
                    emissive: 0x553300,
                    emissiveIntensity: 0.35,
                });

                const letter = new THREE.Mesh(geo, mat);

                // angle for this letter
                const a = startAngle + i * step;

                letter.position.set(
                    Math.cos(a) * radius,
                    Math.sin(a * verticalTilt) * 25, // slight vertical wave
                    Math.sin(a) * radius
                );

                // face the planet center
                letter.lookAt(0, 0, 0);

                group.add(letter);
            });

            resolve(group);
        });
    });
}

// SCENE BUILD
const planet = createPlanet();
scene.add(planet);

// moons
const moonParent1 = new THREE.Object3D();
const moon1 = createMoon(6, 0xffffff);
moon1.position.set(80, 10, 0);
moonParent1.add(moon1);
scene.add(moonParent1);

const moonParent2 = new THREE.Object3D();
const moon2 = createMoon(2.8, 0xaad4ff);
moon2.position.set(50, -35, 0);
moonParent2.add(moon2);
scene.add(moonParent2);

// stars
const stars = createStars();
scene.add(stars);

// orbiting text
let textGroup;
createOrbitText("UNIVERSE").then((g) => {
    textGroup = g;
    scene.add(g);
});

// Raycaster for hover & click
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isHover = false;

function onPointerMove(e) {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
}

function onClick(e) {
    // detect planet click -> open menu
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(planet.userData.sphere, true);
    if (hit.length > 0) {
        openMenu();
        // scale bounce
        gsap.fromTo(
            planet.scale,
            { x: 1, y: 1, z: 1 },
            { x: 1.06, y: 1.06, z: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.inOut" }
        );
    }
}

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("click", onClick);

// Hover check loop
function hoverCheck() {
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(planet.userData.sphere, true);
    if (hit.length > 0) {
        if (!isHover) {
            isHover = true;
            onHoverEnter(hit[0]);
        }
    } else {
        if (isHover) {
            isHover = false;
            onHoverLeave();
        }
    }
}

function onHoverEnter(hit) {
    // yoyo wobble
    gsap.to(planet.rotation, {
        x: planet.rotation.x + 0.6,
        y: planet.rotation.y + 0.6,
        duration: 0.6,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
    });
}

function onHoverLeave() {
    // gentle settle
    gsap.to(planet.rotation, { x: 0, y: 0, duration: 1.4, ease: "elastic.out(1,0.6)" });
}

// Menu open/close
const menu = document.getElementById("menu");
const menuClose = document.getElementById("menu-close");
function openMenu() {
    menu.classList.remove("hidden");
    gsap.fromTo(
        menu,
        { opacity: 0, y: -10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power4.out" }
    );
}

function closeMenu() {
    gsap.to(menu, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.35,
        ease: "power3.in",
        onComplete() {
            menu.classList.add("hidden");
        },
    });
}

menuClose.addEventListener("click", closeMenu);

// Animate
let last = 0;
function animate(t) {
    const dt = (t - last) / 1000;
    last = t;
    hoverCheck();

    // rotate orbits
    moonParent1.rotation.y += 0.18 * dt;
    moonParent2.rotation.y += -0.3 * dt;

    // planet slow rotation
    planet.rotation.y += 0.08 * dt;
    planet.userData.cloud.rotation.y += 0.12 * dt;

    // orbit text rotate when present
    if (textGroup) {
        textGroup.rotation.y -= 0.18 * dt; // faster, smooth orbit

        textGroup.children.forEach((letter) => {
            letter.rotation.y += 0.005; // slight personal spin
        });
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Resize
window.addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
});
