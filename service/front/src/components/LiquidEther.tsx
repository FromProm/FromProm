import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './LiquidEther.css';

interface LiquidEtherProps {
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

export default function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6
}: LiquidEtherProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const webglRef = useRef<WebGLManager | null>(null);
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops: string[]) {
      const arr = stops.length === 1 ? [stops[0], stops[0]] : stops.length > 0 ? stops : ['#ffffff', '#ffffff'];
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    // Shaders
    const face_vert = `attribute vec3 position;uniform vec2 boundarySpace;varying vec2 uv;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
    const line_vert = `attribute vec3 position;uniform vec2 px;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
    const mouse_vert = `attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
    const advection_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(!isBFECC){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;gl_FragColor=vec4(texture2D(velocity,uv2).xy,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;gl_FragColor=vec4(texture2D(velocity,spot_old2).xy,0.0,0.0);}}`;
    const color_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
    const divergence_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;gl_FragColor=vec4((x1-x0+y1-y0)/2.0/dt);}`;
    const externalForce_frag = `precision highp float;uniform vec2 force;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
    const poisson_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;gl_FragColor=vec4((p0+p1+p2+p3)/4.0-div);}`;
    const pressure_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;gl_FragColor=vec4(v-gradP*dt,0.0,1.0);}`;
    const viscous_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}`;

    // Common class
    class CommonClass {
      width = 0; height = 0; aspect = 1; pixelRatio = 1;
      container: HTMLElement | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      clock: THREE.Clock | null = null;
      time = 0; delta = 0;

      init(container: HTMLElement) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.clock = new THREE.Clock();
        this.clock.start();
      }
      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }
      update() {
        if (!this.clock) return;
        this.delta = this.clock.getDelta();
        this.time += this.delta;
      }
    }
    const Common = new CommonClass();

    // Mouse class
    class MouseClass {
      coords = new THREE.Vector2();
      coords_old = new THREE.Vector2();
      diff = new THREE.Vector2();
      container: HTMLElement | null = null;
      isAutoActive = false;
      autoIntensity = 2.0;

      init(container: HTMLElement) { this.container = container; }
      setNormalized(nx: number, ny: number) { this.coords.set(nx, ny); }
      update() {
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.isAutoActive) this.diff.multiplyScalar(this.autoIntensity);
      }
      dispose() {}
    }
    const Mouse = new MouseClass();

    // AutoDriver
    class AutoDriver {
      mouse: MouseClass;
      enabled: boolean;
      speed: number;
      active = false;
      current = new THREE.Vector2(0, 0);
      target = new THREE.Vector2();
      lastTime = performance.now();
      margin = 0.2;

      constructor(mouse: MouseClass, opts: { enabled: boolean; speed: number }) {
        this.mouse = mouse;
        this.enabled = opts.enabled;
        this.speed = opts.speed;
        this.pickNewTarget();
      }
      pickNewTarget() {
        this.target.set((Math.random() * 2 - 1) * (1 - this.margin), (Math.random() * 2 - 1) * (1 - this.margin));
      }
      forceStop() { this.active = false; this.mouse.isAutoActive = false; }
      update() {
        if (!this.enabled) return;
        if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = performance.now(); }
        this.mouse.isAutoActive = true;
        const now = performance.now();
        let dtSec = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;
        const dir = new THREE.Vector2().subVectors(this.target, this.current);
        const dist = dir.length();
        if (dist < 0.01) { this.pickNewTarget(); return; }
        dir.normalize();
        const move = Math.min(this.speed * dtSec, dist);
        this.current.addScaledVector(dir, move);
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    // ShaderPass
    class ShaderPass {
      scene: THREE.Scene;
      camera: THREE.Camera;
      material: THREE.RawShaderMaterial | null = null;
      output: THREE.WebGLRenderTarget | null;
      uniforms: Record<string, { value: unknown }>;

      constructor(props: { material?: { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }>; blending?: THREE.Blending; depthWrite?: boolean }; output?: THREE.WebGLRenderTarget | null }) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.output = props.output || null;
        this.uniforms = props.material?.uniforms || {};
        if (props.material) {
          this.material = new THREE.RawShaderMaterial({ vertexShader: props.material.vertexShader, fragmentShader: props.material.fragmentShader, uniforms: props.material.uniforms, blending: props.material.blending, depthWrite: props.material.depthWrite });
          const geo = new THREE.PlaneGeometry(2, 2);
          this.scene.add(new THREE.Mesh(geo, this.material));
        }
      }
      update() {
        if (!Common.renderer) return;
        Common.renderer.setRenderTarget(this.output);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
      }
    }

    // Advection
    class Advection extends ShaderPass {
      line: THREE.LineSegments;
      constructor(props: { cellScale: THREE.Vector2; fboSize: THREE.Vector2; dt: number; src: THREE.WebGLRenderTarget; dst: THREE.WebGLRenderTarget }) {
        super({ material: { vertexShader: face_vert, fragmentShader: advection_frag, uniforms: { boundarySpace: { value: props.cellScale }, px: { value: props.cellScale }, fboSize: { value: props.fboSize }, velocity: { value: props.src.texture }, dt: { value: props.dt }, isBFECC: { value: true } } }, output: props.dst });
        const boundaryG = new THREE.BufferGeometry();
        boundaryG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]), 3));
        const boundaryM = new THREE.RawShaderMaterial({ vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms });
        this.line = new THREE.LineSegments(boundaryG, boundaryM);
        this.scene.add(this.line);
      }
      updatePass(opts: { dt: number; isBounce: boolean; BFECC: boolean }) {
        this.uniforms.dt.value = opts.dt;
        this.line.visible = opts.isBounce;
        this.uniforms.isBFECC.value = opts.BFECC;
        this.update();
      }
    }

    // ExternalForce
    class ExternalForce extends ShaderPass {
      mouse: THREE.Mesh;
      constructor(props: { cellScale: THREE.Vector2; cursor_size: number; dst: THREE.WebGLRenderTarget }) {
        super({ output: props.dst });
        const mouseG = new THREE.PlaneGeometry(1, 1);
        const mouseM = new THREE.RawShaderMaterial({ vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { px: { value: props.cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(props.cursor_size, props.cursor_size) } } });
        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
      }
      updatePass(props: { mouse_force: number; cursor_size: number; cellScale: THREE.Vector2 }) {
        const u = (this.mouse.material as THREE.RawShaderMaterial).uniforms;
        u.force.value.set((Mouse.diff.x / 2) * props.mouse_force, (Mouse.diff.y / 2) * props.mouse_force);
        const csX = props.cursor_size * props.cellScale.x, csY = props.cursor_size * props.cellScale.y;
        u.center.value.set(Math.min(Math.max(Mouse.coords.x, -1 + csX), 1 - csX), Math.min(Math.max(Mouse.coords.y, -1 + csY), 1 - csY));
        u.scale.value.set(props.cursor_size, props.cursor_size);
        this.update();
      }
    }

    // Viscous
    class Viscous extends ShaderPass {
      output0: THREE.WebGLRenderTarget;
      output1: THREE.WebGLRenderTarget;
      constructor(props: { cellScale: THREE.Vector2; boundarySpace: THREE.Vector2; viscous: number; src: THREE.WebGLRenderTarget; dst: THREE.WebGLRenderTarget; dst_: THREE.WebGLRenderTarget; dt: number }) {
        super({ material: { vertexShader: face_vert, fragmentShader: viscous_frag, uniforms: { boundarySpace: { value: props.boundarySpace }, velocity: { value: props.src.texture }, velocity_new: { value: props.dst_.texture }, v: { value: props.viscous }, px: { value: props.cellScale }, dt: { value: props.dt } } }, output: props.dst });
        this.output0 = props.dst_;
        this.output1 = props.dst;
      }
      updatePass(opts: { viscous: number; iterations: number; dt: number }) {
        this.uniforms.v.value = opts.viscous;
        let fbo_out = this.output1;
        for (let i = 0; i < opts.iterations; i++) {
          const fbo_in = i % 2 === 0 ? this.output0 : this.output1;
          fbo_out = i % 2 === 0 ? this.output1 : this.output0;
          this.uniforms.velocity_new.value = fbo_in.texture;
          this.output = fbo_out;
          this.uniforms.dt.value = opts.dt;
          this.update();
        }
        return fbo_out;
      }
    }

    // Divergence
    class Divergence extends ShaderPass {
      constructor(props: { cellScale: THREE.Vector2; boundarySpace: THREE.Vector2; src: THREE.WebGLRenderTarget; dst: THREE.WebGLRenderTarget; dt: number }) {
        super({ material: { vertexShader: face_vert, fragmentShader: divergence_frag, uniforms: { boundarySpace: { value: props.boundarySpace }, velocity: { value: props.src.texture }, px: { value: props.cellScale }, dt: { value: props.dt } } }, output: props.dst });
      }
      updatePass(vel: THREE.WebGLRenderTarget) { this.uniforms.velocity.value = vel.texture; this.update(); }
    }

    // Poisson
    class Poisson extends ShaderPass {
      output0: THREE.WebGLRenderTarget;
      output1: THREE.WebGLRenderTarget;
      constructor(props: { cellScale: THREE.Vector2; boundarySpace: THREE.Vector2; src: THREE.WebGLRenderTarget; dst: THREE.WebGLRenderTarget; dst_: THREE.WebGLRenderTarget }) {
        super({ material: { vertexShader: face_vert, fragmentShader: poisson_frag, uniforms: { boundarySpace: { value: props.boundarySpace }, pressure: { value: props.dst_.texture }, divergence: { value: props.src.texture }, px: { value: props.cellScale } } }, output: props.dst });
        this.output0 = props.dst_;
        this.output1 = props.dst;
      }
      updatePass(iterations: number) {
        let p_out = this.output1;
        for (let i = 0; i < iterations; i++) {
          const p_in = i % 2 === 0 ? this.output0 : this.output1;
          p_out = i % 2 === 0 ? this.output1 : this.output0;
          this.uniforms.pressure.value = p_in.texture;
          this.output = p_out;
          this.update();
        }
        return p_out;
      }
    }

    // Pressure
    class Pressure extends ShaderPass {
      constructor(props: { cellScale: THREE.Vector2; boundarySpace: THREE.Vector2; src_p: THREE.WebGLRenderTarget; src_v: THREE.WebGLRenderTarget; dst: THREE.WebGLRenderTarget; dt: number }) {
        super({ material: { vertexShader: face_vert, fragmentShader: pressure_frag, uniforms: { boundarySpace: { value: props.boundarySpace }, pressure: { value: props.src_p.texture }, velocity: { value: props.src_v.texture }, px: { value: props.cellScale }, dt: { value: props.dt } } }, output: props.dst });
      }
      updatePass(vel: THREE.WebGLRenderTarget, pressure: THREE.WebGLRenderTarget) {
        this.uniforms.velocity.value = vel.texture;
        this.uniforms.pressure.value = pressure.texture;
        this.update();
      }
    }

    // Simulation
    class Simulation {
      options: { iterations_poisson: number; iterations_viscous: number; mouse_force: number; resolution: number; cursor_size: number; viscous: number; isBounce: boolean; dt: number; isViscous: boolean; BFECC: boolean };
      fbos: Record<string, THREE.WebGLRenderTarget> = {};
      fboSize = new THREE.Vector2();
      cellScale = new THREE.Vector2();
      boundarySpace = new THREE.Vector2();
      advection!: Advection;
      externalForce!: ExternalForce;
      viscousPass!: Viscous;
      divergence!: Divergence;
      poisson!: Poisson;
      pressure!: Pressure;

      constructor(opts: Partial<Simulation['options']>) {
        this.options = { iterations_poisson: 32, iterations_viscous: 32, mouse_force: 20, resolution: 0.5, cursor_size: 100, viscous: 30, isBounce: false, dt: 0.014, isViscous: false, BFECC: true, ...opts };
        this.init();
      }
      init() { this.calcSize(); this.createAllFBO(); this.createShaderPass(); }
      getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }
      createAllFBO() {
        const type = this.getFloatType();
        const opts = { type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        ['vel_0', 'vel_1', 'vel_viscous0', 'vel_viscous1', 'div', 'pressure_0', 'pressure_1'].forEach(k => { this.fbos[k] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts); });
      }
      createShaderPass() {
        this.advection = new Advection({ cellScale: this.cellScale, fboSize: this.fboSize, dt: this.options.dt, src: this.fbos.vel_0, dst: this.fbos.vel_1 });
        this.externalForce = new ExternalForce({ cellScale: this.cellScale, cursor_size: this.options.cursor_size, dst: this.fbos.vel_1 });
        this.viscousPass = new Viscous({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, viscous: this.options.viscous, src: this.fbos.vel_1, dst: this.fbos.vel_viscous1, dst_: this.fbos.vel_viscous0, dt: this.options.dt });
        this.divergence = new Divergence({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.vel_viscous0, dst: this.fbos.div, dt: this.options.dt });
        this.poisson = new Poisson({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.div, dst: this.fbos.pressure_1, dst_: this.fbos.pressure_0 });
        this.pressure = new Pressure({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src_p: this.fbos.pressure_0, src_v: this.fbos.vel_viscous0, dst: this.fbos.vel_0, dt: this.options.dt });
      }
      calcSize() {
        const w = Math.max(1, Math.round(this.options.resolution * Common.width));
        const h = Math.max(1, Math.round(this.options.resolution * Common.height));
        this.cellScale.set(1 / w, 1 / h);
        this.fboSize.set(w, h);
      }
      resize() { this.calcSize(); Object.values(this.fbos).forEach(fbo => fbo.setSize(this.fboSize.x, this.fboSize.y)); }
      update() {
        this.boundarySpace.copy(this.options.isBounce ? new THREE.Vector2(0, 0) : this.cellScale);
        this.advection.updatePass({ dt: this.options.dt, isBounce: this.options.isBounce, BFECC: this.options.BFECC });
        this.externalForce.updatePass({ cursor_size: this.options.cursor_size, mouse_force: this.options.mouse_force, cellScale: this.cellScale });
        let vel: THREE.WebGLRenderTarget = this.fbos.vel_1;
        if (this.options.isViscous) vel = this.viscousPass.updatePass({ viscous: this.options.viscous, iterations: this.options.iterations_viscous, dt: this.options.dt });
        this.divergence.updatePass(vel);
        const pressureFbo = this.poisson.updatePass(this.options.iterations_poisson);
        this.pressure.updatePass(vel, pressureFbo);
      }
    }

    // Output
    class Output {
      simulation: Simulation;
      scene: THREE.Scene;
      camera: THREE.Camera;
      output: THREE.Mesh;

      constructor() {
        this.simulation = new Simulation({ mouse_force: mouseForce, cursor_size: cursorSize, isViscous, viscous, iterations_viscous: iterationsViscous, iterations_poisson: iterationsPoisson, dt, BFECC, resolution, isBounce });
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.output = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: color_frag, transparent: true, depthWrite: false, uniforms: { velocity: { value: this.simulation.fbos.vel_0.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } } }));
        this.scene.add(this.output);
      }
      resize() { this.simulation.resize(); }
      render() { if (Common.renderer) { Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene, this.camera); } }
      update() { this.simulation.update(); this.render(); }
    }

    // WebGLManager
    class WebGLManager {
      output: Output;
      autoDriver: AutoDriver;
      running = false;

      constructor(container: HTMLElement) {
        Common.init(container);
        Mouse.init(container);
        Mouse.autoIntensity = autoIntensity;
        this.autoDriver = new AutoDriver(Mouse, { enabled: autoDemo, speed: autoSpeed });
        container.prepend(Common.renderer!.domElement);
        this.output = new Output();
      }
      resize() { Common.resize(); this.output.resize(); }
      render() { this.autoDriver.update(); Mouse.update(); Common.update(); this.output.update(); }
      loop = () => { if (!this.running) return; this.render(); rafRef.current = requestAnimationFrame(this.loop); };
      start() { if (this.running) return; this.running = true; this.loop(); }
      pause() { this.running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); }
      dispose() {
        Mouse.dispose();
        if (Common.renderer) {
          const canvas = Common.renderer.domElement;
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          Common.renderer.dispose();
        }
      }
    }

    const container = mountRef.current;
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';
    const webgl = new WebGLManager(container);
    webglRef.current = webgl;
    webgl.start();

    const ro = new ResizeObserver(() => { if (webglRef.current) (webglRef.current as any).resize(); });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (webglRef.current) (webglRef.current as any).dispose();
      webglRef.current = null;
    };
  }, [colors, mouseForce, cursorSize, isViscous, viscous, iterationsViscous, iterationsPoisson, dt, BFECC, resolution, isBounce, autoDemo, autoSpeed, autoIntensity]);

  return <div ref={mountRef} className={`liquid-ether-container ${className}`} style={style} />;
}

type WebGLManager = InstanceType<typeof Object>;
