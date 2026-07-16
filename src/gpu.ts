// =============================================================================
// gpu.ts — WebGPU compute-shader rendering pipeline.
//
// Mirrors the CPU pipeline (engine.ts) but runs entirely on the GPU:
//   1. SDF rasterization   — parallel per-pixel SDF evaluation (CPU, closure-based)
//   2. Jump Flood EDT      — O(log n) distance transform (replaces F&H)
//   3. Normal computation  — central differences on distance field
//   4. Blinn-Phong shading — per-pixel lighting with tone ramp
//   5. GPU blit            — composite each part's crop into full accumulator
//   6. Downsample + quant  — box-filter downsample, optional palette quantize
//
// Usage:
//   const gpu = new GPURenderer();
//   await gpu.init();
//   const buf = await gpu.renderParts(parts, opts);   // single sprite
//   const bufs = await gpu.renderBatch(partSets, opts); // N sprites sequential
//   gpu.dispose();
//
// Falls back to CPU (engine.ts) when WebGPU is unavailable.
// =============================================================================

import type { RGB, SpriteBuffer, Material } from './types';
import type { RenderOpts } from './engine';
import type { Part } from './shapes';
import { extractSDFDesc } from './shapes';
import { renderParts } from './engine';

// ---- WGSL shader sources ---------------------------------------------------

const WGSL_JFA_INIT = /* wgsl */ `
@group(0) @binding(0) var<storage, read> mask: array<u32>;
@group(0) @binding(1) var<storage, read_write> jfa: array<vec2<i32>>;
@group(0) @binding(2) var<uniform> dims: vec4<u32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = dims.x; let h = dims.y;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) {
    jfa[idx] = vec2<i32>(i32(gid.x), i32(gid.y));
  } else {
    jfa[idx] = vec2<i32>(-9999, -9999);
  }
}
`;

const WGSL_JFA_STEP = /* wgsl */ `
@group(0) @binding(0) var<storage, read> jfa_in: array<vec2<i32>>;
@group(0) @binding(1) var<storage, read_write> jfa_out: array<vec2<i32>>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // w, h, step, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = i32(params.x); let h = i32(params.y); let step = i32(params.z);
  let ix = i32(gid.x); let iy = i32(gid.y);
  if (ix >= w || iy >= h) { return; }
  let idx = u32(iy * w + ix);
  var best = jfa_in[idx];
  var bestDist = 1e12;
  if (best.x >= 0) { bestDist = f32((ix - best.x) * (ix - best.x) + (iy - best.y) * (iy - best.y)); }
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let nx = ix + dx * step; let ny = iy + dy * step;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) { continue; }
      let cand = jfa_in[u32(ny * w + nx)];
      if (cand.x < 0) { continue; }
      let d = f32((ix - cand.x) * (ix - cand.x) + (iy - cand.y) * (iy - cand.y));
      if (d < bestDist) { bestDist = d; best = cand; }
    }
  }
  jfa_out[idx] = best;
}
`;

const WGSL_DISTANCE = /* wgsl */ `
@group(0) @binding(0) var<storage, read> jfa: array<vec2<i32>>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> dist: array<f32>;
@group(0) @binding(3) var<storage, read_write> max_dist: array<atomic<u32>>;
@group(0) @binding(4) var<uniform> dims: vec4<u32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = dims.x; let h = dims.y;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { dist[idx] = 0.0; return; }
  let seed = jfa[idx];
  if (seed.x < 0) { dist[idx] = 0.0; return; }
  let dx = i32(gid.x) - seed.x; let dy = i32(gid.y) - seed.y;
  let d = sqrt(f32(dx * dx + dy * dy));
  dist[idx] = d;
  atomicMax(&max_dist[0], u32(d * 256.0));
}
`;

const WGSL_NORMALS = /* wgsl */ `
@group(0) @binding(0) var<storage, read> dist: array<f32>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> normals: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> params: vec4<f32>; // w, h, bevel, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = u32(params.x); let h = u32(params.y); let bevel = params.z;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { normals[idx] = vec4(0.0); return; }
  let x = gid.x; let y = gid.y;
  let xm = select(dist[idx - 1u], dist[idx], x == 0u);
  let xp = select(dist[idx + 1u], dist[idx], x >= w - 1u);
  let ym = select(dist[(y - 1u) * w + x], dist[idx], y == 0u);
  let yp = select(dist[(y + 1u) * w + x], dist[idx], y >= h - 1u);
  var gx = (xp - xm) * 0.5;
  var gy = (yp - ym) * 0.5;
  let glen = max(length(vec2(gx, gy)), 1e-6);
  gx /= glen; gy /= glen;
  let t = clamp(dist[idx] / max(bevel, 1e-3), 0.0, 1.0);
  let HALF_PI = 1.5707963;
  let theta = HALF_PI * (1.0 - t);
  let s = sin(theta);
  normals[idx] = vec4(-gx * s, -gy * s, cos(theta), 1.0);
}
`;

const WGSL_SHADE_COMBINED = /* wgsl */ `
struct MaterialGPU {
  base_r: f32, base_g: f32, base_b: f32,
  spec_strength: f32,
  roughness: f32,
  metallic: f32,
  shadow_cool_shift: f32,
  _pad: f32,
}

struct LightUni {
  lx: f32, ly: f32, lz: f32, ambient: f32,
  hx: f32, hy: f32, hz: f32, _pad: f32,
  w: u32, h: u32, _p2: u32, _p3: u32,
}

@group(0) @binding(0) var<storage, read> normals: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> mask: array<u32>;
@group(0) @binding(2) var<storage, read_write> accum: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> mat: MaterialGPU;
@group(0) @binding(4) var<uniform> light: LightUni;

fn ss(e0: f32, e1: f32, v: f32) -> f32 {
  let t = clamp((v - e0) / max(e1 - e0, 1e-6), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let w = light.w; let h = light.h;
  if (gid.x >= w || gid.y >= h) { return; }
  let idx = gid.y * w + gid.x;
  if (mask[idx] == 0u) { return; }
  let n = normals[idx];
  if (n.w == 0.0) { return; }

  let base = vec3(mat.base_r, mat.base_g, mat.base_b);
  let cs = mat.shadow_cool_shift;
  let cool = vec3(base.x * (1.0 - 0.12 * cs), base.y * (1.0 - 0.04 * cs), base.z * (1.0 + 0.08 * cs));
  let warm = vec3(base.x + (255.0 - base.x) * 0.12, base.y + (255.0 - base.y) * 0.08, base.z + (255.0 - base.z) * 0.02);
  let core   = cool * 0.38;
  let shadow = cool * 0.65;
  let mid    = base;
  let lt     = warm * 1.14;
  let hi     = mix(warm * 1.20, vec3(255.0), vec3(0.22));

  let ndotl = n.x * light.lx + n.y * light.ly + n.z * light.lz;
  let x = clamp(light.ambient + (1.0 - light.ambient) * (ndotl * 0.5 + 0.5), 0.0, 1.0);

  var diff: vec3<f32>;
  if (x < 0.35) { let t = ss(0.0, 0.35, x); diff = mix(core, shadow, vec3(t)); }
  else if (x < 0.48) { let t = ss(0.35, 0.48, x); diff = mix(shadow, mid, vec3(t)); }
  else if (x < 0.74) { let t = ss(0.48, 0.74, x); diff = mix(mid, lt, vec3(t)); }
  else { let t = ss(0.74, 1.0, x); diff = mix(lt, hi, vec3(t)); }

  let ndoth = n.x * light.hx + n.y * light.hy + n.z * light.hz;
  let shininess = 8.0 + (1.0 - mat.roughness) * (1.0 - mat.roughness) * 132.0;
  var spec = 0.0;
  if (ndoth > 0.0 && mat.spec_strength > 0.0) {
    spec = pow(ndoth, shininess) * mat.spec_strength;
  }

  var spec_col: vec3<f32>;
  if (mat.metallic > 0.5) {
    spec_col = vec3(255.0 * 0.35 + base.x * 0.65, 255.0 * 0.35 + base.y * 0.65, 255.0 * 0.35 + base.z * 0.65);
  } else {
    spec_col = vec3(255.0);
  }

  let color = diff + spec_col * spec;
  accum[idx] = vec4(color, 255.0);
}
`;

// GPU-side blit: composites a crop-sized buffer into the full accumulator.
// Opaque overwrite (same as CPU pipeline — later parts fully overwrite earlier ones).
const WGSL_BLIT = /* wgsl */ `
@group(0) @binding(0) var<storage, read> crop: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> accum: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // cropW, cropH, offsetX, offsetY
@group(0) @binding(3) var<uniform> dims: vec4<u32>;   // fullW, fullH, _, _

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let cw = params.x; let ch = params.y;
  let ox = params.z; let oy = params.w;
  let fw = dims.x;
  if (gid.x >= cw || gid.y >= ch) { return; }
  let ci = gid.y * cw + gid.x;
  let pixel = crop[ci];
  if (pixel.w <= 0.0) { return; }
  let fi = (oy + gid.y) * fw + (ox + gid.x);
  accum[fi] = pixel;
}
`;

const WGSL_DOWNSAMPLE = /* wgsl */ `
@group(0) @binding(0) var<storage, read> accum: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // outW, outH, ss, quantizeLevels

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let outW = params.x; let outH = params.y; let ss = params.z; let quant = params.w;
  if (gid.x >= outW || gid.y >= outH) { return; }
  let W = outW * ss;
  let area = f32(ss * ss);
  var r = 0.0; var g = 0.0; var b = 0.0; var a = 0.0;
  for (var sy = 0u; sy < ss; sy++) {
    for (var sx = 0u; sx < ss; sx++) {
      let si = (gid.y * ss + sy) * W + (gid.x * ss + sx);
      let sa = accum[si].w;
      let w = sa / 255.0;
      r += accum[si].x * w; g += accum[si].y * w; b += accum[si].z * w; a += sa;
    }
  }
  let aw = select(a / 255.0, 1.0, a == 0.0);
  var cr = clamp(r / aw, 0.0, 255.0);
  var cg = clamp(g / aw, 0.0, 255.0);
  var cb = clamp(b / aw, 0.0, 255.0);
  let ca = clamp(a / area, 0.0, 255.0);

  if (quant > 1u) {
    let step = 255.0 / f32(quant - 1u);
    if (ca >= 8.0) {
      cr = round(cr / step) * step;
      cg = round(cg / step) * step;
      cb = round(cb / step) * step;
    }
  }

  let oi = gid.y * outW + gid.x;
  output[oi] = (u32(ca) << 24u) | (u32(cb) << 16u) | (u32(cg) << 8u) | u32(cr);
}
`;

// ---- GPU Part encoding -----------------------------------------------------

interface GPUSDFPart {
  sdfType: number;
  params: number[];
  bbox: [number, number, number, number];
  material: Material;
  roundness: number;
}

function encodePartsForGPU(parts: Part[]): GPUSDFPart[] | null {
  const result: GPUSDFPart[] = [];
  for (const p of parts) {
    const desc = extractSDFDesc(p.sdf);
    if (!desc) return null;
    result.push({
      sdfType: desc.type,
      params: desc.params,
      bbox: p.bbox,
      material: p.material,
      roundness: p.roundness ?? 0.55,
    });
  }
  return result;
}

// ---- Helpers ---------------------------------------------------------------

function alignTo(n: number, alignment: number): number {
  return Math.ceil(n / alignment) * alignment;
}

function normalizeVec3(v: { x: number; y: number; z: number }) {
  const l = Math.hypot(v.x, v.y, v.z) || 1e-6;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// ---- GPURenderer class -----------------------------------------------------

export class GPURenderer {
  private device: GPUDevice | null = null;
  private jfaInitPipeline: GPUComputePipeline | null = null;
  private jfaStepPipeline: GPUComputePipeline | null = null;
  private distPipeline: GPUComputePipeline | null = null;
  private normalsPipeline: GPUComputePipeline | null = null;
  private shadePipeline: GPUComputePipeline | null = null;
  private blitPipeline: GPUComputePipeline | null = null;
  private downsamplePipeline: GPUComputePipeline | null = null;
  private _ready = false;

  get ready(): boolean { return this._ready; }

  async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      this.device = await adapter.requestDevice();

      this.jfaInitPipeline = this.createPipeline(WGSL_JFA_INIT);
      this.jfaStepPipeline = this.createPipeline(WGSL_JFA_STEP);
      this.distPipeline = this.createPipeline(WGSL_DISTANCE);
      this.normalsPipeline = this.createPipeline(WGSL_NORMALS);
      this.shadePipeline = this.createPipeline(WGSL_SHADE_COMBINED);
      this.blitPipeline = this.createPipeline(WGSL_BLIT);
      this.downsamplePipeline = this.createPipeline(WGSL_DOWNSAMPLE);

      this._ready = true;
      return true;
    } catch {
      return false;
    }
  }

  private createPipeline(wgsl: string): GPUComputePipeline {
    const module = this.device!.createShaderModule({ code: wgsl });
    return this.device!.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
  }

  private buf(size: number, usage: number): GPUBuffer {
    return this.device!.createBuffer({ size: alignTo(Math.max(size, 4), 4), usage });
  }

  private uniform(data: ArrayBufferView): GPUBuffer {
    const b = this.buf(data.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.device!.queue.writeBuffer(b, 0, data as unknown as Uint8Array);
    return b;
  }

  private uniformRaw(data: ArrayBuffer): GPUBuffer {
    const b = this.buf(data.byteLength, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.device!.queue.writeBuffer(b, 0, new Uint8Array(data));
    return b;
  }

  async renderParts(parts: Part[], opts: RenderOpts): Promise<SpriteBuffer> {
    const gpuParts = encodePartsForGPU(parts);
    if (!this._ready || !gpuParts) return renderParts(parts, opts);

    const device = this.device!;
    const { size, ss, W, H } = opts;
    const pixels = W * H;

    const STORAGE = GPUBufferUsage.STORAGE;
    const RW = STORAGE | GPUBufferUsage.COPY_SRC;

    const accumBuf = this.buf(pixels * 16, RW | GPUBufferUsage.COPY_DST);
    device.queue.writeBuffer(accumBuf, 0, new Float32Array(pixels * 4));

    const L = normalizeVec3(opts.light.dir);
    const V = { x: 0, y: 0, z: 1 };
    const rawH = { x: L.x + V.x, y: L.y + V.y, z: L.z + V.z };
    const H_v = normalizeVec3(rawH);

    // Pre-build the light uniform (shared across all parts)
    const lightData = new ArrayBuffer(48);
    const lightFloats = new Float32Array(lightData, 0, 8);
    lightFloats[0] = L.x; lightFloats[1] = L.y; lightFloats[2] = L.z;
    lightFloats[3] = opts.light.ambient;
    lightFloats[4] = H_v.x; lightFloats[5] = H_v.y; lightFloats[6] = H_v.z;
    lightFloats[7] = 0;
    // w, h filled per-part below

    const fullDimsU = this.uniform(new Uint32Array([W, H, 0, 0]));

    const partBuffers: GPUBuffer[] = [accumBuf, fullDimsU];

    try {
      for (let pi = 0; pi < gpuParts.length; pi++) {
        const gp = gpuParts[pi];
        const [bx0, by0, bx1, by1] = gp.bbox;
        const cx0 = Math.max(0, (bx0 | 0) - 1);
        const cy0 = Math.max(0, (by0 | 0) - 1);
        const cx1 = Math.min(W, (bx1 | 0) + 2);
        const cy1 = Math.min(H, (by1 | 0) + 2);
        const cw = cx1 - cx0, ch = cy1 - cy0;
        if (cw <= 0 || ch <= 0) continue;
        const cpx = cw * ch;
        const wgX = Math.ceil(cw / 16), wgY = Math.ceil(ch / 16);

        const buffers: GPUBuffer[] = [];
        try {
          // -- SDF rasterize (CPU — closures can't run on GPU) --
          const maskData = new Uint32Array(cpx);
          for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
              if (parts[pi].sdf(cx0 + x + 0.5, cy0 + y + 0.5) < 0) maskData[y * cw + x] = 1;
            }
          }
          const maskBuf = this.buf(cpx * 4, RW | GPUBufferUsage.COPY_DST);
          device.queue.writeBuffer(maskBuf, 0, maskData);
          buffers.push(maskBuf);

          // -- JFA init --
          const jfaA = this.buf(cpx * 8, RW | GPUBufferUsage.COPY_DST);
          const jfaB = this.buf(cpx * 8, RW);
          const jfaDims = this.uniform(new Uint32Array([cw, ch, 0, 0]));
          buffers.push(jfaA, jfaB, jfaDims);

          let enc = device.createCommandEncoder();
          {
            const bg = device.createBindGroup({
              layout: this.jfaInitPipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: maskBuf } },
                { binding: 1, resource: { buffer: jfaA } },
                { binding: 2, resource: { buffer: jfaDims } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.jfaInitPipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
          }

          // -- JFA steps (batched into one encoder) --
          const maxDim = Math.max(cw, ch);
          let step = 1;
          while (step < maxDim) step *= 2;
          let src = jfaA, dst = jfaB;
          const jfaStepUniforms: GPUBuffer[] = [];
          while (step >= 1) {
            const stepU = this.uniform(new Uint32Array([cw, ch, step, 0]));
            jfaStepUniforms.push(stepU);
            const bg = device.createBindGroup({
              layout: this.jfaStepPipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: src } },
                { binding: 1, resource: { buffer: dst } },
                { binding: 2, resource: { buffer: stepU } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.jfaStepPipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
            [src, dst] = [dst, src];
            step = step >> 1;
          }
          buffers.push(...jfaStepUniforms);
          device.queue.submit([enc.finish()]);

          // -- Distance from JFA --
          const distBuf = this.buf(cpx * 4, RW);
          const maxDistBuf = this.buf(4, RW | GPUBufferUsage.COPY_DST);
          device.queue.writeBuffer(maxDistBuf, 0, new Uint32Array([0]));
          const distDims = this.uniform(new Uint32Array([cw, ch, 0, 0]));
          buffers.push(distBuf, maxDistBuf, distDims);

          enc = device.createCommandEncoder();
          {
            const bg = device.createBindGroup({
              layout: this.distPipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: src } },
                { binding: 1, resource: { buffer: maskBuf } },
                { binding: 2, resource: { buffer: distBuf } },
                { binding: 3, resource: { buffer: maxDistBuf } },
                { binding: 4, resource: { buffer: distDims } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.distPipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
          }

          // Read maxDist back (only GPU→CPU readback per part)
          const maxDistRead = this.buf(4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
          buffers.push(maxDistRead);
          enc.copyBufferToBuffer(maxDistBuf, 0, maxDistRead, 0, 4);
          device.queue.submit([enc.finish()]);
          await maxDistRead.mapAsync(GPUMapMode.READ);
          const maxDistVal = new Uint32Array(maxDistRead.getMappedRange())[0] / 256;
          maxDistRead.unmap();

          if (maxDistVal <= 0) continue;

          // -- Normals --
          const normalsBuf = this.buf(cpx * 16, RW);
          const bevel = Math.max(1.5, gp.roundness * maxDistVal);
          const normParams = this.uniform(new Float32Array([cw, ch, bevel, 0]));
          buffers.push(normalsBuf, normParams);

          enc = device.createCommandEncoder();
          {
            const bg = device.createBindGroup({
              layout: this.normalsPipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: distBuf } },
                { binding: 1, resource: { buffer: maskBuf } },
                { binding: 2, resource: { buffer: normalsBuf } },
                { binding: 3, resource: { buffer: normParams } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.normalsPipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
          }

          // -- Shade into crop-sized buffer --
          const cropAccum = this.buf(cpx * 16, RW | GPUBufferUsage.COPY_DST);
          device.queue.writeBuffer(cropAccum, 0, new Float32Array(cpx * 4));
          buffers.push(cropAccum);

          const mat = gp.material;
          const matData = new Float32Array([
            mat.base[0], mat.base[1], mat.base[2], mat.specStrength,
            mat.roughness, mat.metallic ? 1 : 0, mat.shadowCoolShift, 0,
          ]);
          const matBuf = this.uniform(matData);
          buffers.push(matBuf);

          // Set per-part crop dimensions in the light uniform
          const perPartLight = new ArrayBuffer(48);
          new Float32Array(perPartLight, 0, 8).set(lightFloats);
          new Uint32Array(perPartLight, 32, 4).set(new Uint32Array([cw, ch, 0, 0]));
          const lightBuf = this.uniformRaw(perPartLight);
          buffers.push(lightBuf);

          {
            const bg = device.createBindGroup({
              layout: this.shadePipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: normalsBuf } },
                { binding: 1, resource: { buffer: maskBuf } },
                { binding: 2, resource: { buffer: cropAccum } },
                { binding: 3, resource: { buffer: matBuf } },
                { binding: 4, resource: { buffer: lightBuf } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.shadePipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
          }

          // -- GPU blit: composite crop into full accumulator (no CPU roundtrip) --
          const blitParams = this.uniform(new Uint32Array([cw, ch, cx0, cy0]));
          buffers.push(blitParams);

          {
            const bg = device.createBindGroup({
              layout: this.blitPipeline!.getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: cropAccum } },
                { binding: 1, resource: { buffer: accumBuf } },
                { binding: 2, resource: { buffer: blitParams } },
                { binding: 3, resource: { buffer: fullDimsU } },
              ],
            });
            const pass = enc.beginComputePass();
            pass.setPipeline(this.blitPipeline!);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(wgX, wgY);
            pass.end();
          }

          device.queue.submit([enc.finish()]);
        } finally {
          for (const b of buffers) b.destroy();
        }
      }

      // -- Downsample --
      const outPixels = size * size;
      const outBuf = this.buf(outPixels * 4, RW);
      const dsParams = this.uniform(new Uint32Array([size, size, ss, opts.quantize || 0]));

      const enc = device.createCommandEncoder();
      {
        const bg = device.createBindGroup({
          layout: this.downsamplePipeline!.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: accumBuf } },
            { binding: 1, resource: { buffer: outBuf } },
            { binding: 2, resource: { buffer: dsParams } },
          ],
        });
        const pass = enc.beginComputePass();
        pass.setPipeline(this.downsamplePipeline!);
        pass.setBindGroup(0, bg);
        pass.dispatchWorkgroups(Math.ceil(size / 16), Math.ceil(size / 16));
        pass.end();
      }

      const readBuf = this.buf(outPixels * 4, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
      enc.copyBufferToBuffer(outBuf, 0, readBuf, 0, outPixels * 4);
      device.queue.submit([enc.finish()]);

      await readBuf.mapAsync(GPUMapMode.READ);
      const raw = new Uint32Array(readBuf.getMappedRange());
      const data = new Uint8ClampedArray(outPixels * 4);
      for (let i = 0; i < outPixels; i++) {
        const v = raw[i];
        data[i * 4] = v & 0xFF;
        data[i * 4 + 1] = (v >> 8) & 0xFF;
        data[i * 4 + 2] = (v >> 16) & 0xFF;
        data[i * 4 + 3] = (v >> 24) & 0xFF;
      }
      readBuf.unmap();

      outBuf.destroy(); dsParams.destroy(); readBuf.destroy();

      if (opts.outlineColor) applyOutlineGPU(data, size, size, opts.outlineColor);

      return { width: size, height: size, data };
    } finally {
      for (const b of partBuffers) b.destroy();
    }
  }

  async renderBatch(partSets: Part[][], opts: RenderOpts): Promise<SpriteBuffer[]> {
    const results: SpriteBuffer[] = [];
    for (const parts of partSets) {
      results.push(await this.renderParts(parts, opts));
    }
    return results;
  }

  dispose(): void {
    this.device?.destroy();
    this.device = null;
    this._ready = false;
  }
}

function applyOutlineGPU(data: Uint8ClampedArray, w: number, h: number, color: RGB): void {
  const snap = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) snap[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (snap[i]) continue;
      const hasNeighbor =
        (x > 0 && snap[i - 1]) || (x < w - 1 && snap[i + 1]) ||
        (y > 0 && snap[i - w]) || (y < h - 1 && snap[i + w]);
      if (hasNeighbor) {
        const j = i * 4;
        data[j] = color[0]; data[j + 1] = color[1]; data[j + 2] = color[2]; data[j + 3] = 255;
      }
    }
  }
}

// ---- Singleton + convenience -----------------------------------------------

let _gpuRenderer: GPURenderer | null = null;

export async function getGPURenderer(): Promise<GPURenderer | null> {
  if (_gpuRenderer?.ready) return _gpuRenderer;
  _gpuRenderer = new GPURenderer();
  const ok = await _gpuRenderer.init();
  if (!ok) { _gpuRenderer = null; return null; }
  return _gpuRenderer;
}

export async function renderPartsGPU(parts: Part[], opts: RenderOpts): Promise<SpriteBuffer> {
  const gpu = await getGPURenderer();
  if (!gpu) return renderParts(parts, opts);
  return gpu.renderParts(parts, opts);
}

export async function renderBatchGPU(partSets: Part[][], opts: RenderOpts): Promise<SpriteBuffer[]> {
  const gpu = await getGPURenderer();
  if (!gpu) return partSets.map(p => renderParts(p, opts));
  return gpu.renderBatch(partSets, opts);
}
