import { useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

  float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  uniform float time;
  uniform float sphering;
  uniform float globing;
  uniform float pointSize;
  attribute vec3 aRand;
  attribute vec3 aGlobe;

  void main() {
    // yatay dalga: plane üzerindeki noktalar z ekseninde gürültüyle dalgalanır
    vec3 terrain = position;
    terrain.z += 0.1 * cnoise(vec3(position.x * 4., position.y * 4., time / 10.));

    // π: her nokta sembolün üzerindeki kendi hedefine gider, hafifçe titreşir
    vec3 cloud = mix(aRand, aGlobe, globing);
    cloud += 0.008 * vec3(
      cnoise(aRand * 6. + vec3(time / 10., 0., 0.)),
      cnoise(aRand * 6. + vec3(0., time / 10., 7.)),
      cnoise(aRand * 6. + vec3(3., 0., time / 10.))
    );

    vec3 p = mix(terrain, cloud, sphering);

    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

function piTargets(count: number, size: number) {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  if (!g) return new Float32Array(count * 3);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // üst çubuk
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(34, 70);
  g.lineTo(222, 70);
  g.stroke();
  // sol bacak
  g.lineWidth = 28;
  g.beginPath();
  g.moveTo(88, 76);
  g.bezierCurveTo(92, 130, 84, 180, 70, 216);
  g.stroke();
  // sağ bacak (altta kıvrık)
  g.beginPath();
  g.moveTo(160, 76);
  g.bezierCurveTo(158, 140, 156, 190, 176, 210);
  g.bezierCurveTo(188, 222, 204, 218, 214, 202);
  g.stroke();

  const data = g.getImageData(0, 0, N, N).data;
  const filled = [];
  for (let i = 0; i < N * N; i++) if (data[i * 4 + 3] > 128) filled.push(i);

  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const px = filled[(Math.random() * filled.length) | 0];
    const x = (px % N) + Math.random() - 0.5;
    const y = Math.floor(px / N) + Math.random() - 0.5;
    out[i * 3] = (x / N - 0.5) * size;
    out[i * 3 + 1] = -(y / N - 0.5) * size;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
  }
  return out;
}

// Kure hedefleri: fibonacci spirali ile yuzeye esit dagitilmis noktalar
function globeTargets(count: number, radius: number) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

const RAD = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Dalgalanan nokta bulutu.
 *
 * shape: "terrain" (altta yatay dalga) | "sphere" (sağda küresel form)
 * Değişince 1.2 sn'lik geçiş animasyonu oynar.
 */
export type DotWaveShape = 'terrain' | 'sphere' | 'globe';

interface DotWaveProps {
  shape?: DotWaveShape;
  color?: string;
  opacity?: number;
  pointSize?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

interface DotWaveApi {
  goTo: (name: DotWaveShape) => void;
  material: THREE.ShaderMaterial;
  pixelRatio: number;
}

export function DotWave({
  shape = 'terrain',
  color = '#ffffff',
  opacity = 1,
  pointSize = 2,
  duration = 1.2,
  className,
  style,
}: DotWaveProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<DotWaveApi | null>(null);
  const propsRef = useRef({ shape, color, opacity, pointSize, duration });
  useEffect(() => {
    propsRef.current = { shape, color, opacity, pointSize, duration };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const width = () => host.clientWidth || 1;
    const height = () => host.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width() / height(), 0.01, 10);
    camera.position.set(0, -0.225, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(1.5, 1.5, 80, 80);
    // π hedefleri: canvas'a çizilen sembolün dolu piksellerinden örneklenir
    const count = geometry.attributes.position.count;
    const rand = piTargets(count, 1.1);
    geometry.setAttribute('aGlobe', new THREE.BufferAttribute(globeTargets(count, 0.7), 3));
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        sphering: { value: 0 },
        globing: { value: 0 },
        pointSize: { value: pointSize * renderer.getPixelRatio() },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader,
      fragmentShader,
    });

    const points = new THREE.Points(geometry, material);
    points.position.y = -0.15;
    scene.add(points);

    // terrain <-> sphere durumlarının hedef değerleri
    type DotState = {
      sphering: number;
      globing: number;
      camZ: number;
      posX: number;
      posY: number;
      rotX: number;
      rotZ: number;
    };
    const TARGETS: Record<DotWaveShape, DotState> = {
      // posX: ekranın yarı genişliğinin oranı (0 = orta, 0.5 = sağ çeyrek)
      terrain: {
        sphering: 0,
        globing: 0,
        camZ: 1.5,
        posX: 0,
        posY: -0.32,
        rotX: -80 * RAD,
        rotZ: 1,
      },
      globe: {
        sphering: 1,
        globing: 1,
        camZ: 3,
        posX: -0.85,
        posY: -0.5,
        rotX: -12 * RAD,
        rotZ: 0,
      },
      sphere: {
        sphering: 1,
        globing: 0,
        camZ: 3,
        posX: 0.5,
        posY: -0.15,
        rotX: -12 * RAD,
        rotZ: 0,
      },
    };
    const state: DotState = { ...TARGETS.terrain };
    let tween: { from: DotState; to: DotState; start: number; ms: number } | null = null;

    const goTo = (name: DotWaveShape) => {
      tween = {
        from: { ...state },
        to: TARGETS[name],
        start: performance.now(),
        ms: propsRef.current.duration * 1000,
      };
    };

    let raf = 0;
    let time = 0;
    const render = (now: number) => {
      time += 0.02;
      if (tween) {
        const t = Math.min((now - tween.start) / tween.ms, 1);
        const e = easeInOut(t);
        for (const k of Object.keys(state) as (keyof DotState)[])
          state[k] = lerp(tween.from[k], tween.to[k], e);
        if (t >= 1) tween = null;
      }
      material.uniforms.time.value = time;
      material.uniforms.sphering.value = state.sphering;
      material.uniforms.globing.value = state.globing;
      camera.position.z = state.camZ;
      const halfW = Math.tan((15 * Math.PI) / 180) * state.camZ * camera.aspect;
      points.position.x = state.posX * halfW;
      points.position.y = state.posY;
      points.rotation.x = state.rotX;
      points.rotation.y =
        Math.sin(time * 0.4) * 0.12 * state.sphering * (1 - state.globing) +
        time * 0.05 * state.globing;
      points.rotation.z = state.rotZ;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onResize = () => {
      renderer.setSize(width(), height());
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    apiRef.current = { goTo, material, pixelRatio: renderer.getPixelRatio() };
    if (propsRef.current.shape !== 'terrain') goTo(propsRef.current.shape);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sahne bir kez kurulur, degisen proplar propsRef/ayri effect'lerle uygulanir
  }, []);

  useEffect(() => {
    apiRef.current?.goTo(shape);
  }, [shape]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const u = api.material.uniforms;
    u.uColor.value.set(color);
    u.uOpacity.value = opacity;
    u.pointSize.value = pointSize * api.pixelRatio;
  }, [color, opacity, pointSize]);

  return (
    <div ref={hostRef} className={className} style={{ width: '100%', height: '100%', ...style }} />
  );
}
