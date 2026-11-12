import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root = document.getElementById('scene-root');
const loadingScreen = document.getElementById('loading-screen');
const stationPanel = document.getElementById('station-panel');

const LAB = {
  width: 24,
  length: 34,
  wallHeight: 9.2,
  tableX: [-5.1, 5.1],
  tableZ: [-10.35, 0, 10.35]
};

const stationInfo = [
  { title: 'Solutions & Mixing', description: 'Prepare solutions, measure liquids and explore how substances combine.' },
  { title: 'Molecular Discovery', description: 'Explore molecular models, chemical structures and the building blocks of matter.' },
  { title: 'Measurement & Analysis', description: 'Use laboratory instruments to observe, measure and compare results.' },
  { title: 'Reaction Studies', description: 'Observe controlled reactions and record the changes that take place.' },
  { title: 'Materials & Compounds', description: 'Investigate samples, compounds and the properties of different materials.' },
  { title: 'Practical Experiments', description: 'A flexible station for guided experiments and independent discovery.' }
];

let renderer;
let scene;
let camera;
let controls;
let raycaster;
let selectedStation = null;
let handGroup;
let handBasePosition;
let handBaseRotation;
let handCollisionOffset = new THREE.Vector3();
let playerVelocity = new THREE.Vector3();
let walkBlend = 0;
let animationFrame = 0;
const movementKeys = new Set();
const stationGroups = [];
const clock = new THREE.Clock();

const PLAYER = {
  eyeHeight: 1.72,
  radius: 0.36,
  walkSpeed: 3.9,
  sprintSpeed: 6.1,
  acceleration: 20,
  deceleration: 24,
  maxSubstep: 0.055,
  // Side-wall inner faces are at +/-11.79. Keep the entire player radius clear.
  minX: -11.40,
  maxX: 11.40,
  minZ: -16.25,
  maxZ: 16.25
};

const HAND_COLLISION_SPHERES = [
  { center: new THREE.Vector3(0, -0.17, 0.025), radius: 0.145 },
  { center: new THREE.Vector3(0, 0.155, 0), radius: 0.18 },
  { center: new THREE.Vector3(0, 0.38, 0), radius: 0.135 },
  { center: new THREE.Vector3(-0.14, 0.13, 0.005), radius: 0.095 }
];

const handCollisionWorldCenters = HAND_COLLISION_SPHERES.map(() => new THREE.Vector3());

const mats = {
  floor: new THREE.MeshStandardMaterial({ color: 0xc8d5d0, roughness: 0.82 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xe4e9e3, roughness: 0.92 }),
  wallSide: new THREE.MeshStandardMaterial({ color: 0xd7e2dc, roughness: 0.9 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x9bb2ad, roughness: 0.7 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: 0x40585a, roughness: 0.62 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0xeff2ed, roughness: 0.55 }),
  cabinetFace: new THREE.MeshStandardMaterial({ color: 0xd1ded9, roughness: 0.48 }),
  counter: new THREE.MeshStandardMaterial({ color: 0x526b6b, roughness: 0.36, metalness: 0.12 }),
  counterTop: new THREE.MeshStandardMaterial({ color: 0xf0f2e9, roughness: 0.28 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xaebfc0, metalness: 0.72, roughness: 0.26 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x42575a, metalness: 0.65, roughness: 0.3 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x42b6a4, emissive: 0x0d5148, emissiveIntensity: 0.35, roughness: 0.32 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xe5f8f5, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28, transmission: 0.48, thickness: 0.12, side: THREE.DoubleSide }),
  windowGlass: new THREE.MeshPhysicalMaterial({ color: 0x9bd4dc, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.68, transmission: 0.22 }),
  liquidBlue: new THREE.MeshStandardMaterial({ color: 0x70c9df, roughness: 0.18, transparent: true, opacity: 0.84 }),
  liquidRose: new THREE.MeshStandardMaterial({ color: 0xe7a0a0, roughness: 0.2, transparent: true, opacity: 0.82 }),
  liquidAmber: new THREE.MeshStandardMaterial({ color: 0xe8bd69, roughness: 0.2, transparent: true, opacity: 0.84 }),
  liquidMint: new THREE.MeshStandardMaterial({ color: 0x7ed0b3, roughness: 0.2, transparent: true, opacity: 0.84 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf8faf4, roughness: 0.42 }),
  black: new THREE.MeshStandardMaterial({ color: 0x273b40, roughness: 0.48 })
};

function standard(material, geometry, parent, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedBox(parent, material, size, position, radius = 0.06, segments = 3) {
  return standard(material, new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius), parent, position);
}

function cylinder(parent, material, top, bottom, height, position, radial = 18, open = false) {
  return standard(material, new THREE.CylinderGeometry(top, bottom, height, radial, 1, open), parent, position);
}

function makeCanvasTexture(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addPlaque(parent, number) {
  const texture = makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#203b40';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#72d4c3';
    ctx.fillRect(0, 0, 13, h);
    ctx.fillStyle = '#eaf4ef';
    ctx.font = '600 105px "Space Grotesk", sans-serif';
    ctx.fillText(String(number).padStart(2, '0'), 48, 157);
    ctx.fillStyle = '#9ebbb5';
    ctx.font = '600 35px "DM Sans", sans-serif';
    ctx.fillText('CHEMVERSE', 205, 153);
  });
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.08 });
  const plaque = standard(material, new THREE.PlaneGeometry(0.94, 0.34), parent, [0, 1.43, 1.72]);
  plaque.userData.stationNumber = number;
}

function addTestTubeRack(parent, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);

  roundedBox(group, mats.darkMetal, [1.48, 0.13, 0.5], [0, 1.52, 0], 0.055);
  roundedBox(group, mats.metal, [1.43, 0.07, 0.13], [0, 1.81, -0.14], 0.025);
  roundedBox(group, mats.metal, [1.43, 0.07, 0.13], [0, 1.81, 0.14], 0.025);

  const liquids = [mats.liquidBlue, mats.liquidRose, mats.liquidAmber, mats.liquidMint, mats.liquidBlue];
  for (let i = 0; i < 5; i += 1) {
    const tx = (i - 2) * 0.255;
    cylinder(group, mats.glass, 0.068, 0.078, 0.64, [tx, 1.99, 0], 14, true);
    cylinder(group, liquids[i], 0.057, 0.063, 0.2 + (i % 2) * 0.05, [tx, 1.72, 0], 14);
    cylinder(group, mats.glass, 0.068, 0.068, 0.025, [tx, 2.32, 0], 14, true);
  }
  return group;
}

function addBeaker(parent, x, z, liquidMaterial, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);

  cylinder(group, mats.glass, 0.16, 0.18, 0.48, [0, 1.75, 0], 28, true);
  cylinder(group, liquidMaterial, 0.145, 0.155, 0.14, [0, 1.58, 0], 28);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 28), mats.glass);
  rim.position.set(0, 2.0, 0);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  roundedBox(group, mats.white, [0.11, 0.018, 0.16], [0, 1.505, 0], 0.015);
  return group;
}

function addFlask(parent, x, z, liquidMaterial, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), mats.glass);
  body.position.set(0, 1.72, 0);
  body.scale.set(1, 1.02, 1);
  body.castShadow = true;
  group.add(body);
  const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), liquidMaterial);
  liquid.position.set(0, 1.65, 0);
  liquid.scale.set(1, 0.43, 1);
  group.add(liquid);
  cylinder(group, mats.glass, 0.075, 0.09, 0.34, [0, 2.0, 0], 20, true);
  cylinder(group, mats.white, 0.083, 0.083, 0.075, [0, 2.19, 0], 18);
  return group;
}

function addMicroscope(parent, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  roundedBox(group, mats.darkMetal, [0.58, 0.12, 0.42], [0, 1.49, 0], 0.055);
  roundedBox(group, mats.metal, [0.15, 0.48, 0.14], [-0.12, 1.77, -0.03], 0.055);
  const arm = roundedBox(group, mats.white, [0.15, 0.53, 0.16], [0.02, 2.0, -0.1], 0.055);
  arm.rotation.z = -0.32;
  const tube = cylinder(group, mats.darkMetal, 0.075, 0.09, 0.36, [0.12, 2.22, -0.18], 18);
  tube.rotation.z = -0.32;
  cylinder(group, mats.metal, 0.12, 0.12, 0.06, [0.1, 2.34, -0.23], 18);
  roundedBox(group, mats.metal, [0.32, 0.035, 0.25], [0.08, 1.78, 0.04], 0.025);
  cylinder(group, mats.accent, 0.055, 0.055, 0.07, [-0.1, 1.88, 0.03], 16);
  return group;
}

function addBottle(parent, x, z, material, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  cylinder(group, mats.white, 0.13, 0.14, 0.42, [0, 1.72, 0], 20);
  cylinder(group, material, 0.12, 0.12, 0.19, [0, 1.61, 0], 20);
  cylinder(group, mats.white, 0.067, 0.067, 0.13, [0, 2.0, 0], 16);
  cylinder(group, mats.accent, 0.075, 0.075, 0.055, [0, 2.085, 0], 16);
  return group;
}

function addBurner(parent, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  cylinder(group, mats.darkMetal, 0.15, 0.17, 0.2, [0, 1.61, 0], 20);
  cylinder(group, mats.metal, 0.075, 0.1, 0.42, [0, 1.9, 0], 18);
  cylinder(group, mats.darkMetal, 0.11, 0.11, 0.06, [0, 2.13, 0], 18);
  roundedBox(group, mats.accent, [0.16, 0.08, 0.12], [0.17, 1.6, 0], 0.025);
  return group;
}

function addStool(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  cylinder(group, mats.darkMetal, 0.11, 0.12, 0.68, [0, 0.42, 0], 16);
  cylinder(group, mats.darkMetal, 0.36, 0.34, 0.13, [0, 0.84, 0], 24);
  cylinder(group, mats.metal, 0.34, 0.34, 0.035, [0, 0.91, 0], 24);
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
    const leg = cylinder(group, mats.metal, 0.035, 0.045, 0.73, [Math.cos(angle) * 0.24, 0.39, Math.sin(angle) * 0.24], 10);
    leg.rotation.z = Math.cos(angle) * 0.12;
    leg.rotation.x = Math.sin(angle) * 0.12;
  }
}

function addStation(number, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.stationNumber = number;
  group.userData.defaultTopColor = 0xe9eee7;
  scene.add(group);

  roundedBox(group, mats.cabinet, [5.25, 0.92, 2.88], [0, 0.72, 0], 0.1, 4);
  const counterTop = roundedBox(group, mats.counterTop, [5.72, 0.2, 3.32], [0, 1.28, 0], 0.09, 4);
  roundedBox(group, mats.darkTrim, [5.58, 0.045, 3.2], [0, 1.165, 0], 0.025);

  // Cabinet doors and fine metal pulls on the student-facing side.
  for (let i = 0; i < 3; i += 1) {
    const dx = (i - 1) * 1.67;
    roundedBox(group, mats.cabinetFace, [1.53, 0.56, 0.065], [dx, 0.7, 1.475], 0.035);
    roundedBox(group, mats.metal, [0.28, 0.035, 0.035], [dx, 0.82, 1.52], 0.015);
  }
  roundedBox(group, mats.darkTrim, [5.1, 0.055, 0.08], [0, 0.27, 1.47], 0.02);
  roundedBox(group, mats.accent, [4.92, 0.025, 0.035], [0, 1.16, 1.63], 0.012);

  addPlaque(group, number);

  // A compact, carefully spaced set of instruments keeps each bench readable.
  addTestTubeRack(group, -0.06, -0.74);
  addFlask(group, -1.72, -0.63, [mats.liquidBlue, mats.liquidRose, mats.liquidAmber][(number - 1) % 3], 0.9);
  addBeaker(group, 1.64, -0.68, [mats.liquidMint, mats.liquidAmber, mats.liquidBlue][(number - 1) % 3], 0.95);
  addBottle(group, 2.15, 0.38, mats.liquidRose, 0.82);
  if (number % 2 === 0) addMicroscope(group, -2.12, 0.43);
  else addBurner(group, -2.12, 0.43);

  // Keep a direct reference to the workbench surface for reliable hover and selection feedback.
  counterTop.userData.stationNumber = number;
  counterTop.material = mats.counterTop.clone();
  counterTop.material.emissive = new THREE.Color(0x000000);
  counterTop.material.emissiveIntensity = 0;
  group.userData.top = counterTop;

  // Local-space collision boxes for the equipment sitting on this workbench.
  // These stop the glove from passing through the glassware as well as the table.
  group.userData.handColliders = [
    // Test-tube rack and raised tubes.
    { minX: -0.84, minY: 1.46, minZ: -1.05, maxX: 0.72, maxY: 2.40, maxZ: -0.43 },
    // Erlenmeyer flask and neck.
    { minX: -2.06, minY: 1.46, minZ: -1.02, maxX: -1.38, maxY: 2.27, maxZ: -0.24 },
    // Beaker and glass rim.
    { minX: 1.40, minY: 1.48, minZ: -0.96, maxX: 1.89, maxY: 2.06, maxZ: -0.39 },
    // Reagent bottle and cap.
    { minX: 1.95, minY: 1.47, minZ: 0.17, maxX: 2.37, maxY: 2.17, maxZ: 0.59 },
    // Microscope or burner, depending on the station.
    { minX: -2.60, minY: 1.45, minZ: 0.02, maxX: -1.65, maxY: 2.49, maxZ: 0.91 }
  ];

  stationGroups.push(group);
  addStool(x, z + 2.55);
}

function addWindows() {
  const frameMaterial = mats.white;
  for (let i = 0; i < 4; i += 1) {
    const x = -8.2 + i * 5.45;
    roundedBox(scene, frameMaterial, [3.45, 2.45, 0.18], [x, 5.35, -16.7], 0.07);
    roundedBox(scene, mats.windowGlass, [3.18, 2.18, 0.07], [x, 5.35, -16.57], 0.025);
    roundedBox(scene, mats.white, [0.055, 2.24, 0.08], [x, 5.35, -16.5], 0.012);
    roundedBox(scene, mats.white, [3.2, 0.055, 0.08], [x, 5.35, -16.5], 0.012);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i += 1) {
      const z = -6.5 + i * 13;
      roundedBox(scene, frameMaterial, [0.18, 2.25, 4.3], [side * 11.78, 5.25, z], 0.07);
      roundedBox(scene, mats.windowGlass, [0.07, 1.99, 4.02], [side * 11.66, 5.25, z], 0.025);
      roundedBox(scene, mats.white, [0.08, 1.99, 0.055], [side * 11.59, 5.25, z], 0.01);
      roundedBox(scene, mats.white, [0.08, 0.055, 4.04], [side * 11.59, 5.25, z], 0.01);
    }
  }
}

function addBackStorage() {
  const counter = roundedBox(scene, mats.counter, [17.8, 1.05, 1.0], [0, 0.72, -15.45], 0.08);
  roundedBox(scene, mats.counterTop, [18.2, 0.16, 1.25], [0, 1.32, -15.42], 0.07);

  for (let i = 0; i < 8; i += 1) {
    const x = -7.7 + i * 2.2;
    roundedBox(scene, mats.cabinetFace, [1.82, 0.78, 0.07], [x, 0.72, -14.91], 0.035);
    roundedBox(scene, mats.metal, [0.22, 0.035, 0.035], [x, 0.77, -14.86], 0.012);
  }

  // Upper storage shelves.
  for (let level = 0; level < 2; level += 1) {
    const y = 2.5 + level * 1.15;
    roundedBox(scene, mats.white, [15.8, 0.13, 0.72], [0, y, -16.05], 0.04);
    for (let i = 0; i < 10; i += 1) {
      const x = -7.0 + i * 1.55;
      const colors = [mats.liquidBlue, mats.liquidAmber, mats.liquidMint, mats.liquidRose];
      cylinder(scene, mats.white, 0.11, 0.12, 0.38, [x, y + 0.25, -16.1], 16);
      cylinder(scene, colors[(i + level) % colors.length], 0.1, 0.1, 0.15, [x, y + 0.16, -16.1], 16);
      cylinder(scene, mats.accent, 0.055, 0.055, 0.05, [x, y + 0.47, -16.1], 12);
    }
  }
  roundedBox(scene, mats.darkTrim, [18.1, 0.08, 0.09], [0, 1.43, -14.78], 0.025);
}

function addRoom() {
  // Floor and low architectural skirting.
  roundedBox(scene, mats.floor, [LAB.width, 0.28, LAB.length], [0, -0.18, 0], 0.08, 3);
  const gridPoints = [];
  for (let x = -11; x <= 11; x += 2) {
    gridPoints.push(new THREE.Vector3(x, -0.035, -16.8), new THREE.Vector3(x, -0.035, 16.8));
  }
  for (let z = -16; z <= 16; z += 2) {
    gridPoints.push(new THREE.Vector3(-11.8, -0.035, z), new THREE.Vector3(11.8, -0.035, z));
  }
  const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x9fb7ae, transparent: true, opacity: 0.24 });
  scene.add(new THREE.LineSegments(gridGeometry, gridMaterial));

  // Three walls frame the room while the front remains open for a clear architectural view.
  roundedBox(scene, mats.wall, [LAB.width, LAB.wallHeight, 0.42], [0, LAB.wallHeight / 2, -17], 0.08);
  roundedBox(scene, mats.wallSide, [0.42, LAB.wallHeight, LAB.length], [-12, LAB.wallHeight / 2, 0], 0.08);
  roundedBox(scene, mats.wallSide, [0.42, LAB.wallHeight, LAB.length], [12, LAB.wallHeight / 2, 0], 0.08);

  roundedBox(scene, mats.trim, [23.6, 0.28, 0.22], [0, 0.02, -16.72], 0.04);
  roundedBox(scene, mats.trim, [0.22, 0.28, 33.5], [-11.72, 0.02, 0], 0.04);
  roundedBox(scene, mats.trim, [0.22, 0.28, 33.5], [11.72, 0.02, 0], 0.04);

  addWindows();
  addBackStorage();

  // Wall-mounted safety point.
  roundedBox(scene, mats.accent, [1.35, 0.9, 0.12], [-11.68, 2.0, 12.2], 0.05);
  cylinder(scene, mats.white, 0.16, 0.16, 0.45, [-11.35, 1.53, 12.2], 18);
  cylinder(scene, mats.white, 0.05, 0.05, 0.32, [-11.35, 1.9, 12.2], 12);
  roundedBox(scene, mats.white, [0.04, 0.65, 0.04], [-11.36, 2.0, 12.2], 0.015);

  // Overhead light housings and luminous panels.
  for (let i = 0; i < 4; i += 1) {
    const z = -11 + i * 7.3;
    for (const x of [-5.8, 5.8]) {
      roundedBox(scene, mats.white, [3.0, 0.16, 1.2], [x, 8.22, z], 0.1);
      const lightPanel = new THREE.Mesh(
        new RoundedBoxGeometry(2.65, 0.035, 0.88, 3, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xfff4dd })
      );
      lightPanel.position.set(x, 8.12, z);
      scene.add(lightPanel);
      const light = new THREE.PointLight(0xfff1d9, 32, 11, 2);
      light.position.set(x, 7.6, z);
      scene.add(light);
    }
  }
}

function setStationHighlight(group, active, selected = false) {
  const top = group && group.userData.top;
  if (!top) return;
  if (active) {
    top.material.emissive.setHex(selected ? 0x185f56 : 0x103d38);
    top.material.emissiveIntensity = selected ? 0.42 : 0.23;
  } else {
    top.material.emissive.setHex(0x000000);
    top.material.emissiveIntensity = 0;
  }
}

function selectStation(group) {
  if (selectedStation) setStationHighlight(selectedStation, false);
  selectedStation = group;
  if (!group) {
    stationPanel.classList.remove('is-open');
    stationPanel.setAttribute('aria-hidden', 'true');
    return;
  }

  setStationHighlight(group, true, true);
  const number = group.userData.stationNumber;
  const info = stationInfo[number - 1];
  document.getElementById('station-number').textContent = String(number).padStart(2, '0');
  document.getElementById('station-title').textContent = info.title;
  document.getElementById('station-description').textContent = info.description;
  stationPanel.classList.add('is-open');
  stationPanel.setAttribute('aria-hidden', 'false');
}

function findStation(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.stationNumber) {
      return stationGroups.find((group) => group.userData.stationNumber === current.userData.stationNumber) || null;
    }
    current = current.parent;
  }
  return null;
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8c9c6);
  scene.fog = new THREE.Fog(0xb8c9c6, 43, 86);

  camera = new THREE.PerspectiveCamera(70, root.clientWidth / root.clientHeight, 0.1, 120);
  camera.position.set(0, PLAYER.eyeHeight, 15.2);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  root.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);
  controls.pointerSpeed = 0.75;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;
  renderer.domElement.style.cursor = 'pointer';

  scene.add(new THREE.HemisphereLight(0xf3fbf5, 0x6e8a84, 2.0));
  const keyLight = new THREE.DirectionalLight(0xfff4dd, 3.2);
  keyLight.position.set(-13, 26, 17);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -28;
  keyLight.shadow.camera.right = 28;
  keyLight.shadow.camera.top = 28;
  keyLight.shadow.camera.bottom = -28;
  keyLight.shadow.bias = -0.00025;
  scene.add(keyLight);

  addRoom();
  let stationNumber = 1;
  for (const z of LAB.tableZ) {
    for (const x of LAB.tableX) {
      addStation(stationNumber, x, z);
      stationNumber += 1;
    }
  }

  raycaster = new THREE.Raycaster();
  createPlayerHand();

  controls.addEventListener('lock', () => {
    document.body.classList.add('player-locked');
    document.getElementById('entry-overlay').classList.add('is-hidden');
  });
  controls.addEventListener('unlock', () => {
    document.body.classList.remove('player-locked');
    document.getElementById('entry-overlay').classList.remove('is-hidden');
    movementKeys.clear();
    playerVelocity.set(0, 0, 0);
  });

  document.getElementById('enter-lab').addEventListener('click', () => controls.lock());
  document.getElementById('close-panel').addEventListener('click', () => selectStation(null));
  renderer.domElement.addEventListener('click', onCanvasClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    movementKeys.clear();
    playerVelocity.set(0, 0, 0);
  });
  window.addEventListener('resize', onResize);

  window.setTimeout(() => loadingScreen.classList.add('is-hidden'), 520);
  animate();
}

function inspectStationAtCrosshair() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(stationGroups, true);
  const station = hits.length ? findStation(hits[0].object) : null;
  if (station) {
    selectStation(station);
    return true;
  }
  selectStation(null);
  return false;
}

function onCanvasClick() {
  if (controls && controls.isLocked) inspectStationAtCrosshair();
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  const movement = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
  if (movement.includes(key)) {
    event.preventDefault();
    movementKeys.add(key);
  }
  if (key === 'e' && !event.repeat && controls && controls.isLocked) {
    event.preventDefault();
    inspectStationAtCrosshair();
  }
}

function onKeyUp(event) {
  movementKeys.delete(event.key.toLowerCase());
}

function circleTouchesAabb2D(x, z, radius, minX, minZ, maxX, maxZ) {
  const closestX = THREE.MathUtils.clamp(x, minX, maxX);
  const closestZ = THREE.MathUtils.clamp(z, minZ, maxZ);
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

function sphereTouchesAabb(center, radius, minX, minY, minZ, maxX, maxY, maxZ) {
  const closestX = THREE.MathUtils.clamp(center.x, minX, maxX);
  const closestY = THREE.MathUtils.clamp(center.y, minY, maxY);
  const closestZ = THREE.MathUtils.clamp(center.z, minZ, maxZ);
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const dz = center.z - closestZ;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

function canOccupy(x, z) {
  const radius = PLAYER.radius;
  if (
    x < PLAYER.minX || x > PLAYER.maxX ||
    z < PLAYER.minZ || z > PLAYER.maxZ
  ) return false;

  // The player's horizontal capsule footprint checks the real workbench bounds.
  for (const station of stationGroups) {
    const sx = station.position.x;
    const sz = station.position.z;
    if (circleTouchesAabb2D(x, z, radius, sx - 2.86, sz - 1.66, sx + 2.86, sz + 1.66)) {
      return false;
    }

    // Round stools are tested as circles instead of oversized square hit areas.
    const stoolZ = sz + 2.55;
    const stoolRadius = radius + 0.36;
    const stoolDX = x - sx;
    const stoolDZ = z - stoolZ;
    if (stoolDX * stoolDX + stoolDZ * stoolDZ < stoolRadius * stoolRadius) return false;
  }

  // Rear storage counter and cabinet footprint.
  if (circleTouchesAabb2D(x, z, radius, -9.1, -16.08, 9.1, -14.82)) return false;
  return true;
}

function updatePlayerMovement(delta) {
  if (!controls || !controls.isLocked) {
    playerVelocity.set(0, 0, 0);
    return false;
  }

  const forwardInput =
    (movementKeys.has('w') || movementKeys.has('arrowup') ? 1 : 0) -
    (movementKeys.has('s') || movementKeys.has('arrowdown') ? 1 : 0);
  const sideInput =
    (movementKeys.has('d') || movementKeys.has('arrowright') ? 1 : 0) -
    (movementKeys.has('a') || movementKeys.has('arrowleft') ? 1 : 0);

  const hasInput = forwardInput !== 0 || sideInput !== 0;
  const desiredVelocity = new THREE.Vector3();

  if (hasInput) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    desiredVelocity.copy(forward).multiplyScalar(forwardInput).addScaledVector(right, sideInput);
    if (desiredVelocity.lengthSq() > 1) desiredVelocity.normalize();

    const speed = movementKeys.has('shift') ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    desiredVelocity.multiplyScalar(speed);
  }

  // Acceleration and deceleration make starts and stops feel weighty rather than instantaneous.
  const response = hasInput ? PLAYER.acceleration : PLAYER.deceleration;
  const blend = 1 - Math.exp(-response * delta);
  playerVelocity.x += (desiredVelocity.x - playerVelocity.x) * blend;
  playerVelocity.z += (desiredVelocity.z - playerVelocity.z) * blend;

  if (!hasInput && playerVelocity.lengthSq() < 0.0025) playerVelocity.set(0, 0, 0);

  const totalDistance = Math.hypot(playerVelocity.x * delta, playerVelocity.z * delta);
  const steps = Math.max(1, Math.ceil(totalDistance / PLAYER.maxSubstep));
  const stepDelta = delta / steps;

  for (let i = 0; i < steps; i += 1) {
    const stepX = playerVelocity.x * stepDelta;
    const stepZ = playerVelocity.z * stepDelta;
    const axes = Math.abs(stepX) >= Math.abs(stepZ) ? ['x', 'z'] : ['z', 'x'];

    for (const axis of axes) {
      if (axis === 'x' && Math.abs(stepX) > 0.000001) {
        const candidateX = camera.position.x + stepX;
        if (canOccupy(candidateX, camera.position.z)) {
          camera.position.x = candidateX;
        } else {
          playerVelocity.x = 0;
        }
      }

      if (axis === 'z' && Math.abs(stepZ) > 0.000001) {
        const candidateZ = camera.position.z + stepZ;
        if (canOccupy(camera.position.x, candidateZ)) {
          camera.position.z = candidateZ;
        } else {
          playerVelocity.z = 0;
        }
      }
    }
  }

  return playerVelocity.lengthSq() > 0.025;
}

function handPoseCollides() {
  camera.updateMatrixWorld(true);
  handGroup.updateWorldMatrix(true, false);
  const matrix = handGroup.matrixWorld;

  for (let i = 0; i < HAND_COLLISION_SPHERES.length; i += 1) {
    const shape = HAND_COLLISION_SPHERES[i];
    const center = handCollisionWorldCenters[i];
    center.copy(shape.center).applyMatrix4(matrix);

    if (center.y - shape.radius < -0.015) return true;

    for (const station of stationGroups) {
      const sx = station.position.x;
      const sz = station.position.z;

      // Exact workbench carcass and counter-slab bounds with a small contact margin.
      if (sphereTouchesAabb(
        center, shape.radius + 0.018,
        sx - 2.625, 0.26, sz - 1.44,
        sx + 2.625, 1.18, sz + 1.44
      )) return true;
      if (sphereTouchesAabb(
        center, shape.radius + 0.018,
        sx - 2.86, 1.18, sz - 1.66,
        sx + 2.86, 1.38, sz + 1.66
      )) return true;

      // Individual equipment colliders are stored in the station's local coordinates.
      const equipment = station.userData.handColliders || [];
      for (const obstacle of equipment) {
        if (sphereTouchesAabb(
          center, shape.radius + 0.012,
          sx + obstacle.minX, obstacle.minY, sz + obstacle.minZ,
          sx + obstacle.maxX, obstacle.maxY, sz + obstacle.maxZ
        )) return true;
      }

      // Stool seat and central support.
      const stoolZ = sz + 2.55;
      if (sphereTouchesAabb(
        center, shape.radius + 0.015,
        sx - 0.38, 0.68, stoolZ - 0.38,
        sx + 0.38, 1.02, stoolZ + 0.38
      )) return true;
    }

    // Rear storage and shelf supports.
    if (sphereTouchesAabb(center, shape.radius + 0.015, -9.1, 0.1, -16.1, 9.1, 1.55, -14.75)) return true;
    if (sphereTouchesAabb(center, shape.radius + 0.01, -8.0, 2.35, -16.45, 8.0, 2.72, -15.65)) return true;
    if (sphereTouchesAabb(center, shape.radius + 0.01, -8.0, 3.48, -16.45, 8.0, 3.85, -15.65)) return true;

    // Side and rear walls.
    if (sphereTouchesAabb(center, shape.radius, -12.22, 0, -17.2, -11.78, 9.2, 17.2)) return true;
    if (sphereTouchesAabb(center, shape.radius, 11.78, 0, -17.2, 12.22, 9.2, 17.2)) return true;
    if (sphereTouchesAabb(center, shape.radius, -12.2, 0, -17.22, 12.2, 9.2, -16.78)) return true;
  }

  return false;
}

function testHandOffset(bobPosition, offset) {
  handGroup.position.copy(bobPosition).add(offset);
  return !handPoseCollides();
}

function findSafeHandOffset(bobPosition, startOffset) {
  // Retract first: a hand approaching a workbench naturally comes back toward the wrist.
  const candidates = [];
  for (let i = 1; i <= 36; i += 1) {
    candidates.push(new THREE.Vector3(0, 0, i * 0.03));
  }

  // If the surface is above or beside the hand, combine a small lift with retraction.
  for (let lift = 1; lift <= 10; lift += 1) {
    for (let retract = 1; retract <= 30; retract += 1) {
      candidates.push(new THREE.Vector3(0, lift * 0.025, retract * 0.03));
    }
  }

  // Last resort: move the hand upward, but do not prefer this over a natural retreat.
  for (let lift = 1; lift <= 20; lift += 1) {
    candidates.push(new THREE.Vector3(0, lift * 0.03, 0));
  }

  for (const targetOffset of candidates) {
    if (!testHandOffset(bobPosition, targetOffset)) continue;

    // Find the first non-penetrating point between the previous and safe poses.
    // This prevents the collision solver from snapping the hand a large distance.
    let unsafeT = 0;
    let safeT = 1;
    const candidateOffset = new THREE.Vector3();

    for (let iteration = 0; iteration < 9; iteration += 1) {
      const middleT = (unsafeT + safeT) * 0.5;
      candidateOffset.copy(startOffset).lerp(targetOffset, middleT);
      if (testHandOffset(bobPosition, candidateOffset)) safeT = middleT;
      else unsafeT = middleT;
    }

    // A tiny extra clearance avoids z-fighting and visual contact at the exact boundary.
    const finalT = Math.min(1, safeT + 0.012);
    return startOffset.clone().lerp(targetOffset, finalT);
  }

  return null;
}

function resolveHandCollision(delta, bobPosition) {
  const currentOffset = handCollisionOffset.clone();

  if (!testHandOffset(bobPosition, currentOffset)) {
    // Smoothly relax the wrist back to its natural resting pose when contact ends.
    const recovery = Math.exp(-7.5 * delta);
    const recoveredOffset = currentOffset.clone().multiplyScalar(recovery);

    if (testHandOffset(bobPosition, recoveredOffset)) {
      handCollisionOffset.copy(recoveredOffset);
      handGroup.visible = true;
    } else {
      handGroup.position.copy(bobPosition).add(currentOffset);
      handGroup.visible = true;
    }
    return;
  }

  const safeOffset = findSafeHandOffset(bobPosition, currentOffset);
  if (safeOffset) {
    handCollisionOffset.copy(safeOffset);
    handGroup.position.copy(bobPosition).add(safeOffset);
    handGroup.visible = true;
    return;
  }

  // If no safe pose exists, hide the glove for this frame rather than render it
  // through a solid bench, cabinet or wall.
  handGroup.visible = false;
}

function createPlayerHand() {
  const glove = new THREE.MeshPhysicalMaterial({
    color: 0xc8e7df,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42
  });
  const gloveShade = new THREE.MeshStandardMaterial({ color: 0x9ccfc3, roughness: 0.46 });
  const coat = new THREE.MeshStandardMaterial({ color: 0xf1f4ed, roughness: 0.72 });
  const cuff = new THREE.MeshStandardMaterial({ color: 0x72cbbb, roughness: 0.42 });

  handGroup = new THREE.Group();
  handGroup.name = 'PLAYER_VISIBLE_RIGHT_HAND';
  handGroup.position.set(0.49, -0.46, -0.92);
  handGroup.rotation.set(-0.05, -0.18, -0.16);
  handBasePosition = handGroup.position.clone();
  handBaseRotation = handGroup.rotation.clone();

  const addPart = (geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    handGroup.add(mesh);
    return mesh;
  };

  // A short white lab-coat cuff; no torso, head, legs or full arms are created.
  addPart(new THREE.CylinderGeometry(0.105, 0.135, 0.34, 24, 1), coat, [0, -0.19, 0.025]);
  addPart(new THREE.CylinderGeometry(0.117, 0.117, 0.065, 24, 1), cuff, [0, -0.015, 0.025]);
  const cuffRing = addPart(new THREE.TorusGeometry(0.113, 0.009, 8, 28), glove, [0, 0.02, 0.025]);
  cuffRing.rotation.x = Math.PI / 2;

  // Palm and five separate, softly rounded gloved fingers.
  addPart(new THREE.SphereGeometry(0.15, 28, 22), glove, [0, 0.155, 0], [1.12, 1.35, 0.48], [0, 0, -0.06]);
  const fingerXs = [-0.105, -0.035, 0.04, 0.11];
  const fingerLengths = [0.16, 0.205, 0.19, 0.15];
  for (let i = 0; i < fingerXs.length; i += 1) {
    const radius = i === 1 ? 0.039 : 0.036;
    const length = fingerLengths[i];
    const baseY = 0.285;
    addPart(
      new THREE.CapsuleGeometry(radius, length, 5, 12),
      glove,
      [fingerXs[i], baseY + (length + radius * 2) / 2 - 0.01, 0],
      [1, 1, 0.82],
      [0, 0, (i - 1.5) * -0.045]
    );
    addPart(new THREE.SphereGeometry(radius * 0.92, 14, 12), gloveShade, [fingerXs[i], baseY + 0.015, 0.002], [1, 0.72, 0.78]);
  }

  // Thumb angles naturally away from the palm.
  addPart(new THREE.CapsuleGeometry(0.043, 0.13, 5, 12), glove, [-0.155, 0.105, 0.005], [1, 1, 0.85], [0, 0, 0.82]);
  addPart(new THREE.SphereGeometry(0.047, 16, 14), glove, [-0.13, 0.19, 0.005], [1, 1, 0.82]);

  // Fine raised glove seam detail gives the hand a finished silhouette.
  addPart(new THREE.SphereGeometry(0.012, 10, 8), gloveShade, [0.02, 0.095, 0.071], [1.1, 0.65, 0.5]);
  camera.add(handGroup);
}

function onResize() {
  if (!renderer || !camera) return;
  const width = root.clientWidth;
  const height = root.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}

function animate() {
  animationFrame = window.requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  const moving = updatePlayerMovement(delta);
  walkBlend = THREE.MathUtils.damp(walkBlend, moving ? 1 : 0, 9, delta);

  if (handGroup) {
    const phase = elapsed * 9.5;
    const bobPosition = new THREE.Vector3(
      handBasePosition.x + Math.sin(phase * 0.5) * 0.009 * walkBlend,
      handBasePosition.y + Math.abs(Math.sin(phase)) * 0.025 * walkBlend + Math.sin(elapsed * 1.1) * 0.003,
      handBasePosition.z
    );
    handGroup.rotation.set(
      handBaseRotation.x + Math.sin(phase) * 0.012 * walkBlend,
      handBaseRotation.y,
      handBaseRotation.z
        + Math.sin(phase * 0.5) * 0.022 * walkBlend
        + Math.sin(elapsed * 0.8) * 0.004
        + Math.min(handCollisionOffset.z * 0.055, 0.07)
    );
    resolveHandCollision(delta, bobPosition);
  }

  // Subtle instrument glints bring a little life to the otherwise calm workspace.
  for (let i = 0; i < stationGroups.length; i += 1) {
    const top = stationGroups[i].userData.top;
    if (top && stationGroups[i] !== selectedStation) {
      top.material.emissiveIntensity = 0.012 + (Math.sin(elapsed * 0.8 + i) + 1) * 0.004;
    }
  }
  renderer.render(scene, camera);
}

try {
  init();
} catch (error) {
  console.error('CHEMVERSE laboratory failed to initialize:', error);
  loadingScreen.classList.add('is-hidden');
  const message = document.createElement('div');
  message.className = 'scene-error';
  message.textContent = 'The 3D laboratory could not start. Please refresh the page or use a browser with WebGL enabled.';
  root.appendChild(message);
}

window.addEventListener('beforeunload', () => {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  if (controls) controls.dispose();
  movementKeys.clear();
  if (renderer) renderer.dispose();
});
