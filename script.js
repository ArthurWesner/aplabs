import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const bgCanvas = document.getElementById("neural-bg");
if (bgCanvas) {
  const ctx = bgCanvas.getContext("2d");
  let particles = [];
  const particleCount = window.innerWidth < 768 ? 25 : 100;

  function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeBg);
  resizeBg();

  class Particle {
    constructor() {
      this.x = Math.random() * (bgCanvas.width + 200) - 100;
      this.y = Math.random() * (bgCanvas.height + 200) - 100;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -100 || this.x > bgCanvas.width + 100) this.vx *= -1;
      if (this.y < -100 || this.y > bgCanvas.height + 100) this.vy *= -1;
    }
  }

  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  function animateBg() {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    ctx.fillStyle = "rgba(168, 85, 247, 0.5)";
    particles.forEach((p, i) => {
      p.update();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 150) {
          ctx.strokeStyle = `rgba(124, 58, 237, ${1 - dist / 150})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(animateBg);
  }
  animateBg();
}

function reveal() {
  document.querySelectorAll(".reveal").forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight - 100) {
      el.classList.add("active");
    }
  });
}
window.addEventListener("scroll", reveal);
reveal();

function initDigitalGlobe() {
  const container = document.getElementById("globe-canvas-container");
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;

  const textureLoader = new THREE.TextureLoader();
  const earthMaskUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg";
  const earthMask = textureLoader.load(earthMaskUrl);

  let earthData = null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = earthMaskUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    earthData = ctx.getImageData(0, 0, img.width, img.height).data;
  };

  const radius = 2;

  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      earthTexture: { value: earthMask },
      colorOcean: { value: new THREE.Color("#100518") },
      colorLand: { value: new THREE.Color("#a855f7") },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D earthTexture;
      uniform vec3 colorOcean;
      uniform vec3 colorLand;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vec4 texColor = texture2D(earthTexture, vUv);
        vec3 baseColor = mix(colorLand, colorOcean, texColor.r);
        float edgeShadow = dot(vNormal, vec3(0.0, 0.0, 1.0));
        vec3 originalGlobe = baseColor * max(0.2, edgeShadow + 0.2);
        
        float fresnel = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        fresnel = pow(fresnel, 2.5);
        vec3 rimLight = vec3(0.66, 0.33, 0.97) * fresnel * 1.5;
        
        vec3 finalColor = originalGlobe + rimLight;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
  const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), earthMaterial);
  earthMesh.rotation.x = 0.2;
  earthMesh.rotation.y = -1.5;
  scene.add(earthMesh);

  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(0.66, 0.33, 0.97, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 64, 64), haloMaterial);
  scene.add(haloMesh);

  const networkGroup = new THREE.Group();
  scene.add(networkGroup);
  networkGroup.rotation.x = 0.2;
  networkGroup.rotation.z = 0.1;

  const satRadius = radius * 1.02;
  const satGeometry = new THREE.IcosahedronGeometry(satRadius, 3);

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  networkGroup.add(new THREE.Mesh(satGeometry, lineMaterial));

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  networkGroup.add(new THREE.Points(satGeometry, pointsMaterial));

  let nodesPositions = [];
  let adjacency = [];
  let activeBeams = [];
  let activeFlashes = [];

  const beamMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const posAttribute = satGeometry.attributes.position;
  for (let i = 0; i < posAttribute.count; i++) {
    let vec = new THREE.Vector3().fromBufferAttribute(posAttribute, i);
    let isDuplicate = false;
    for (let j = 0; j < nodesPositions.length; j++) {
      if (vec.distanceTo(nodesPositions[j]) < 0.05) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      nodesPositions.push(vec);
      adjacency.push([]);
    }
  }

  for (let i = 0; i < nodesPositions.length; i++) {
    for (let j = i + 1; j < nodesPositions.length; j++) {
      if (nodesPositions[i].distanceTo(nodesPositions[j]) < 0.65) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }

  function chargeAndFire() {
    if (nodesPositions.length === 0) return;

    let startNode = -1;
    if (earthData) {
      for (let attempts = 0; attempts < 10; attempts++) {
        let idx = Math.floor(Math.random() * nodesPositions.length);
        let nodeWorld = new THREE.Vector3().copy(nodesPositions[idx]);
        nodeWorld.applyQuaternion(networkGroup.quaternion);

        let invEarthQ = earthMesh.quaternion.clone().invert();
        let earthLocal = nodeWorld.applyQuaternion(invEarthQ).normalize();

        let u = 0.5 + Math.atan2(earthLocal.z, earthLocal.x) / (2 * Math.PI);
        let v = 0.5 + Math.asin(earthLocal.y) / Math.PI;

        let px = Math.floor(u * 2048);
        let py = Math.floor((1 - v) * 1024);
        px = Math.max(0, Math.min(2047, px));
        py = Math.max(0, Math.min(1023, py));

        if (earthData[(py * 2048 + px) * 4] > 128) {
          startNode = idx;
          break;
        }
      }
    }
    if (startNode === -1) {
      startNode = Math.floor(Math.random() * nodesPositions.length);
    }

    let neighbors = adjacency[startNode].sort(() => 0.5 - Math.random()).slice(0, 3);
    if (neighbors.length === 0) return;

    const startPos = nodesPositions[startNode];
    const flashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff1e46,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    flashMesh.position.copy(startPos);
    networkGroup.add(flashMesh);
    activeFlashes.push({ mesh: flashMesh, life: 1.0 });

    setTimeout(() => {
      neighbors.forEach((targetNode) => {
        const numPoints = 15;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));

        const colors = new Float32Array(numPoints * 3);
        for (let j = 0; j < numPoints; j++) {
          let ratio = j / (numPoints - 1);
          let intensity = Math.pow(ratio, 1.5);
          colors[j * 3] = (1.0 * (1 - ratio) + 0.66 * ratio) * intensity;
          colors[j * 3 + 1] = (0.12 * (1 - ratio) + 0.33 * ratio) * intensity;
          colors[j * 3 + 2] = (0.27 * (1 - ratio) + 0.97 * ratio) * intensity;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const line = new THREE.Line(geometry, beamMaterial);
        networkGroup.add(line);
        activeBeams.push({
          line,
          start: startPos,
          end: nodesPositions[targetNode],
          progress: 0,
          speed: 0.025 + Math.random() * 0.02,
        });
      });
    }, 100);
  }

  setInterval(() => {
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) chargeAndFire();
  }, 400);

  function animate() {
    requestAnimationFrame(animate);
    earthMesh.rotation.y += 0.0035;
    networkGroup.rotation.y += 0.0015;

    for (let i = activeFlashes.length - 1; i >= 0; i--) {
      let f = activeFlashes[i];
      f.life -= 0.05;
      f.mesh.scale.setScalar(1 + (1 - f.life) * 0.3);
      f.mesh.material.opacity = f.life;
      if (f.life <= 0) {
        networkGroup.remove(f.mesh);
        activeFlashes.splice(i, 1);
      }
    }

    for (let i = activeBeams.length - 1; i >= 0; i--) {
      let b = activeBeams[i];
      b.progress += b.speed;
      if (b.progress >= 1.5) {
        networkGroup.remove(b.line);
        activeBeams.splice(i, 1);
        continue;
      }

      let posAttr = b.line.geometry.attributes.position;
      const numPoints = posAttr.count;
      for (let j = 0; j < numPoints; j++) {
        let ratio = j / (numPoints - 1);
        let localProg = b.progress - 0.4 + (0.4 * ratio);
        localProg = Math.max(0, Math.min(1, localProg));

        let pos = new THREE.Vector3().lerpVectors(b.start, b.end, localProg);
        posAttr.setXYZ(j, pos.x, pos.y, pos.z);
      }
      posAttr.needsUpdate = true;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

document.addEventListener("DOMContentLoaded", initDigitalGlobe);