import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

const CYAN = new THREE.Color("#00eaff");
const ICE = new THREE.Color("#b9fbff");
const ORANGE = new THREE.Color("#ff8a00");

const STATES = {
  idle:   { speed: 0.16, pulse: 0.16, glow: 0.42 },
  wake:   { speed: 0.72, pulse: 0.42, glow: 0.82 },
  listen: { speed: 1.15, pulse: 0.78, glow: 1.00 },
  think:  { speed: 1.65, pulse: 0.92, glow: 0.96 },
  speak:  { speed: 0.92, pulse: 0.68, glow: 0.92 }
};

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, "rgba(0,234,255,.9)");
  gradient.addColorStop(0.38, "rgba(0,180,255,.25)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeGalaxy(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const arms = 5;

  for (let i = 0; i < count; i++) {
    const radius = 52 + Math.pow(Math.random(), 0.72) * 245;
    const arm = Math.floor(Math.random() * arms);
    const angle = (arm / arms) * Math.PI * 2
      + radius * 0.012
      + (Math.random() - 0.5) * 0.72;
    const spread = 5 + radius * 0.075;

    positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.72 + (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * (24 + radius * 0.34);

    const mix = Math.random();
    const color = mix > 0.91 ? ORANGE : mix > 0.64 ? ICE : CYAN;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.55 + Math.random() * 1.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return geometry;
}

function makeNucleusParticles(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 18;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(a) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(a) * s * r;

    const color = Math.random() > 0.76 ? ORANGE : CYAN;
    sizes[i] = 0.7 + Math.random() * 1.5;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return geometry;
}

function particleMaterial(size, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0.2 },
      uPointSize: { value: size },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 color;
      uniform float uTime;
      uniform float uPulse;
      uniform float uPointSize;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float wave = sin(uTime * 1.25 + length(position) * 0.045);
        p += normalize(position + vec3(0.001)) * wave * (0.8 + uPulse * 2.4);
        p.x += sin(uTime * 0.7 + position.y * 0.035) * (0.5 + uPulse);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uPointSize * aSize * (260.0 / max(80.0, -mvPosition.z));
        vColor = color;
        vAlpha = 0.55 + 0.45 * sin(uTime * 1.8 + length(position) * 0.08);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float glow = 1.0 - smoothstep(0.08, 0.5, d);
        if (glow < 0.015) discard;
        gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
      }
    `
  });
}

export function createHIVAICore(container, onMetrics = () => {}) {
  if (!container) throw new Error("HIVAI core container was not found.");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1800);
  camera.position.set(0, 0, 570);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: window.innerWidth > 700,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const root = new THREE.Group();
  scene.add(root);

  const galaxy = new THREE.Group();
  root.add(galaxy);

  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const galaxyMaterial = particleMaterial(mobile ? 2.2 : 2.6, 0.86);
  const galaxyPoints = new THREE.Points(makeGalaxy(mobile ? 2600 : 6200), galaxyMaterial);
  galaxy.add(galaxyPoints);

  const nucleusGroup = new THREE.Group();
  root.add(nucleusGroup);

  const nucleusMaterial = particleMaterial(mobile ? 3.2 : 3.8, 1);
  const nucleusPoints = new THREE.Points(makeNucleusParticles(mobile ? 650 : 1500), nucleusMaterial);
  nucleusGroup.add(nucleusPoints);

  const glowMap = makeGlowTexture();
  const cyanGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap, color: CYAN, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  cyanGlow.scale.set(230, 230, 1);
  root.add(cyanGlow);

  const orangeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap, color: ORANGE, transparent: true, opacity: 0.82,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  orangeGlow.scale.set(112, 112, 1);
  nucleusGroup.add(orangeGlow);

  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(13, 3),
    new THREE.MeshBasicMaterial({ color: 0xffbd72, transparent: true, opacity: 0.96 })
  );
  nucleusGroup.add(heart);

  const heartWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(22, 2),
    new THREE.MeshBasicMaterial({
      color: ORANGE, wireframe: true, transparent: true,
      opacity: 0.62, blending: THREE.AdditiveBlending
    })
  );
  nucleusGroup.add(heartWire);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(48, 2),
    new THREE.MeshBasicMaterial({
      color: CYAN, wireframe: true, transparent: true,
      opacity: 0.14, blending: THREE.AdditiveBlending
    })
  );
  root.add(shell);

  function makeRing(radius, tube, color, opacity, rotation) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 6, 180),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    ring.rotation.set(rotation[0], rotation[1], rotation[2]);
    root.add(ring);
    return ring;
  }

  const rings = [
    makeRing(76, 0.75, CYAN, 0.42, [0.85, 0.1, 0.2]),
    makeRing(112, 0.55, ORANGE, 0.30, [1.25, 0.4, 0.1]),
    makeRing(154, 0.65, CYAN, 0.25, [0.3, 1.0, 0.8]),
    makeRing(202, 0.42, ORANGE, 0.18, [1.7, 0.2, 0.4]),
    makeRing(246, 0.35, CYAN, 0.14, [0.6, 1.4, 0.1])
  ];

  const orbiters = [];
  for (let i = 0; i < 34; i++) {
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowMap,
      color: i % 6 === 0 ? ORANGE : CYAN,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    const radius = 62 + Math.random() * 190;
    const angle = Math.random() * Math.PI * 2;
    const size = 5 + Math.random() * 8;
    dot.scale.set(size, size, 1);
    galaxy.add(dot);
    orbiters.push({ dot, radius, angle, speed: 0.12 + Math.random() * 0.34, phase: Math.random() * 6.28 });
  }

  const starGeometry = makeGalaxy(mobile ? 420 : 1100);
  const starMaterial = particleMaterial(1.1, 0.38);
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.scale.setScalar(1.55);
  scene.add(stars);

  let state = "idle";
  let audioLevel = 0;
  let frame = 0;
  let elapsed = 0;
  let last = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let disposed = false;

  function setState(next) {
    if (STATES[next]) state = next;
  }

  function setAudioLevel(value) {
    audioLevel = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  }

  function resize() {
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("resize", resize);

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.22;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.16;
  }
  container.addEventListener("pointermove", onPointerMove, { passive: true });

  function animate(now) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);

    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;
    elapsed += dt;

    const config = STATES[state];
    const pulse = config.pulse + audioLevel * 0.72
      + (state === "think" ? (0.5 + 0.5 * Math.sin(elapsed * 7)) * 0.18 : 0);
    const speed = config.speed * (1 + audioLevel * 0.8);

    pointerX += (targetX - pointerX) * 0.035;
    pointerY += (targetY - pointerY) * 0.035;

    root.rotation.y = Math.sin(elapsed * 0.12) * 0.08 + pointerX;
    root.rotation.x = Math.sin(elapsed * 0.16) * 0.035 + pointerY;
    galaxy.rotation.z += dt * 0.035 * speed;
    galaxy.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
    nucleusGroup.rotation.y += dt * 0.34 * speed;
    nucleusGroup.rotation.x = Math.sin(elapsed * 0.42) * 0.13;
    nucleusPoints.rotation.z -= dt * 0.22 * speed;
    heartWire.rotation.x += dt * 0.24 * speed;
    heartWire.rotation.y -= dt * 0.31 * speed;
    heart.scale.setScalar(1 + pulse * 0.12 + Math.sin(elapsed * 3.2) * 0.035);
    shell.rotation.x += dt * 0.035;
    shell.rotation.y -= dt * 0.055;
    shell.scale.setScalar(1 + pulse * 0.035);

    galaxyMaterial.uniforms.uTime.value = elapsed;
    galaxyMaterial.uniforms.uPulse.value = pulse;
    nucleusMaterial.uniforms.uTime.value = elapsed * 1.35;
    nucleusMaterial.uniforms.uPulse.value = pulse;
    starMaterial.uniforms.uTime.value = elapsed * 0.35;
    starMaterial.uniforms.uPulse.value = pulse * 0.2;

    cyanGlow.material.opacity = config.glow * (0.72 + pulse * 0.12);
    cyanGlow.scale.setScalar(210 + pulse * 30);
    orangeGlow.material.opacity = 0.56 + pulse * 0.28;
    orangeGlow.scale.setScalar(100 + pulse * 24);

    rings.forEach((ring, index) => {
      ring.rotation.z += dt * (index % 2 ? -1 : 1) * (0.025 + index * 0.004) * speed;
      ring.rotation.x += dt * 0.009 * speed;
      ring.material.opacity = (0.12 + pulse * 0.08) * (1 - index * 0.08);
    });

    orbiters.forEach((item) => {
      item.angle += dt * item.speed * speed;
      const r = item.radius * (1 + audioLevel * 0.035);
      item.dot.position.set(
        Math.cos(item.angle) * r,
        Math.sin(item.angle) * r * 0.68,
        Math.sin(item.angle * 1.7 + item.phase) * (18 + r * 0.12)
      );
      item.dot.material.opacity = 0.38 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * 2 + item.phase));
    });

    const energy = Math.round(Math.min(99, (state === "idle" ? 18 : state === "listen" ? 88 : state === "think" ? 84 : 68) + audioLevel * 12 + pulse * 3));
    if (Math.floor(elapsed * 8) !== Math.floor((elapsed - dt) * 8)) {
      onMetrics({ energy, load: Math.round(Math.min(99, energy * 0.82)), state });
    }

    renderer.render(scene, camera);
  }

  resize();
  frame = requestAnimationFrame(animate);

  return {
    setState,
    setAudioLevel,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      container.removeEventListener("pointermove", onPointerMove);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose?.();
      });
      glowMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
