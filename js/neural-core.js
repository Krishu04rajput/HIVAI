import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

const STATES = {
  idle:   { speed: 0.16, pulse: 0.16, glow: 0.42 },
  wake:   { speed: 0.72, pulse: 0.42, glow: 0.82 },
  listen: { speed: 1.15, pulse: 0.78, glow: 1.00 },
  think:  { speed: 1.65, pulse: 0.92, glow: 0.96 },
  speak:  { speed: 0.92, pulse: 0.68, glow: 0.92 }
};

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

  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const nucleusGroup = new THREE.Group();
  root.add(nucleusGroup);

  // Smooth luminous nucleus wrapped in a restrained Fresnel energy shell.
  // A living plasma singularity: turbulent cyan filaments wrapped around a hot pearl core.
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(17, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0.2 } },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPulse;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.1));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          vec2 uv = vUv - 0.5;
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          float t = uTime * (0.28 + uPulse * 0.22);
          vec3 q = vec3(uv * 5.0, t);
          float n = noise(q * 2.8) * 0.65 + noise(q * 5.6 + 3.0) * 0.35;
          float spiral = angle * 4.0 - radius * 34.0 + n * 7.0 - t * 3.2;
          float filament = pow(max(0.0, sin(spiral)), 13.0);
          float secondary = pow(max(0.0, sin(spiral * 1.73 + n * 4.0)), 20.0);
          float turbulence = smoothstep(0.18, 0.92, n + 0.18 * sin(angle * 7.0 - t * 2.0));
          float core = 1.0 - smoothstep(0.02, 0.34, radius);
          vec3 deep = vec3(0.006, 0.035, 0.075);
          vec3 blue = vec3(0.015, 0.30, 0.55);
          vec3 cyan = vec3(0.02, 0.78, 0.98);
          vec3 pearl = vec3(0.78, 0.98, 1.0);
          vec3 color = mix(deep, blue, turbulence * 0.9);
          color = mix(color, cyan, filament * 0.92 + secondary * 0.55);
          color = mix(color, pearl, core * 0.94);
          float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.4);
          color += vec3(0.0, 0.38, 0.58) * rim * 0.75;
          float alpha = 0.9 + filament * 0.1;
          gl_FragColor = vec4(color * (1.0 + uPulse * 0.18), alpha);
        }
      `,
      transparent: false,
      depthWrite: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  );
  nucleusGroup.add(heart);

  const energyShell = new THREE.Mesh(
    new THREE.SphereGeometry(25, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0.2 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
          float flow = 0.72 + 0.28 * sin(uTime * 1.7 + vNormal.y * 5.0);
          vec3 cyan = vec3(0.12, 0.82, 1.0);
          vec3 pearl = vec3(0.72, 0.96, 1.0);
          vec3 color = mix(cyan, pearl, fresnel * 0.72);
          float alpha = (0.08 + fresnel * 0.48) * flow * (0.8 + uPulse * 0.2);
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  );
  nucleusGroup.add(energyShell);



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

    root.rotation.y = Math.sin(elapsed * 0.12) * 0.035 + pointerX * 0.35;
    root.rotation.x = Math.sin(elapsed * 0.16) * 0.02 + pointerY * 0.35;
    nucleusGroup.rotation.y = Math.sin(elapsed * 0.18) * 0.12;
    heart.scale.setScalar(1 + pulse * 0.055 + Math.sin(elapsed * 2.1) * 0.018);
    heart.material.uniforms.uTime.value = elapsed;
    heart.material.uniforms.uPulse.value = pulse;
    energyShell.rotation.y += dt * 0.055 * speed;
    energyShell.rotation.x = Math.sin(elapsed * 0.22) * 0.08;
    energyShell.scale.setScalar(1 + pulse * 0.018);
    energyShell.material.uniforms.uTime.value = elapsed;
    energyShell.material.uniforms.uPulse.value = pulse;

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
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
