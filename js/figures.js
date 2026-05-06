import * as THREE from 'three';

let camera, scene, renderer, core, particles;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
let currentPrimaryColor = '';

document.addEventListener('DOMContentLoaded', init);

function init() {
    const container = document.getElementById('hero-canvas');
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.z = 500;

    scene = new THREE.Scene();
    
    // Core Geometry - Crystalline Icosahedron
    const coreGeometry = new THREE.IcosahedronGeometry(150, 1);
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
        shininess: 100
    });
    
    core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Inner Core - Solid morphing shape
    const innerGeometry = new THREE.IcosahedronGeometry(80, 2);
    const innerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        flatShading: true
    });
    const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
    core.add(innerCore);

    // Particles Cloud
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 1000;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 2,
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });

    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);

    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
}

function onMouseMove(event) {
    mouseX = (event.clientX - window.innerWidth / 2);
    mouseY = (event.clientY - window.innerHeight / 2);
}

function onWindowResize() {
    const container = document.getElementById('hero-canvas');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}

function updateColors() {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    if (primary !== currentPrimaryColor) {
        currentPrimaryColor = primary;
        const color = new THREE.Color(primary);
        core.material.color.copy(color);
        particles.material.color.copy(color);
        core.children[0].material.color.copy(color);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Smooth mouse follow
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    core.rotation.y = time * 0.2;
    core.rotation.x = time * 0.1;
    
    // Add some "morphing" feel via rotation offset
    core.rotation.z = Math.sin(time * 0.5) * 0.2;
    
    // Particles movement
    particles.rotation.y = time * 0.05;
    particles.rotation.x = targetY * 0.001;
    particles.rotation.z = targetX * 0.001;

    // Pulsing scale
    const s = 1 + Math.sin(time * 2) * 0.05;
    core.scale.set(s, s, s);

    updateColors();
    renderer.render(scene, camera);
}