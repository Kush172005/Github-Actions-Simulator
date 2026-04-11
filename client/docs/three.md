# Three.js (reference)

Docs: [https://threejs.org/docs/](https://threejs.org/docs/)

Use Three.js when **canvas/WebGL** is required: 3D models, custom shaders, post-processing, or performance-friendly particle systems. For UI-only motion, prefer **CSS / Motion / GSAP** on DOM.

---

## Project integration

| Practice | Why |
|----------|-----|
| **Isolate** in a dedicated client component | Clear lifecycle: mount = init, unmount = dispose. |
| **Single render loop** | `renderer.setAnimationLoop` **or** one `requestAnimationFrame` chain—not both for the same renderer. |
| **Resize handling** | On container/window resize: `camera.aspect = w/h`, `camera.updateProjectionMatrix()`, `renderer.setSize(w, h)`. |
| **Pixel ratio cap** | `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` to limit fill rate on retina displays. |

---

## Optional React stack

If the app uses **React Three Fiber**:

- `@react-three/fiber` — declarative scenes; still **dispose** custom resources in `useEffect` cleanups.
- `@react-three/drei` — helpers (`Environment`, `useGLTF`, `OrbitControls`).

The reference `/lib` folder does not assume R3F; add these at project setup if needed.

---

## Asset loading

- **GLTF/GLB:** `GLTFLoader`; clone scenes for repeated instances (`SkeletonUtils.clone` when needed).
- **HDR environment:** `RGBELoader` + `PMREMGenerator` for realistic lighting—or Drei’s `<Environment />` if using R3F.

---

## Memory: disposal checklist

On component unmount or when replacing geometry/material:

1. **`geometry.dispose()`**
2. **`material.dispose()`** (each material; multi-material meshes iterate)
3. **Textures** on materials: `map`, `normalMap`, etc.—`texture.dispose()`
4. **`renderer.dispose()`** if this component owns the WebGLRenderer
5. **Cancel** `setAnimationLoop(null)` or cancel rAF

Leaked WebGL contexts are a common SPA memory bug after route changes.

---

## Performance

- **Instancing** (`InstancedMesh`) for many identical meshes.
- **Merge** static geometry when profiling shows draw call pressure.
- **Frustum culling** is automatic; avoid huge single meshes if LOD helps.
- **Shaders:** prefer simpler materials until profiling; post-processing passes add GPU cost.

---

## Interaction with scroll

- **Drei `ScrollControls`** or manual: map `scrollY` / Lenis progress to camera or object transforms.
- Keep updates **throttled** or tied to rAF; do not set React state per scroll frame for Three output.

---

## Safety

- WebGL can fail on old or restricted environments; provide a **fallback** (static image or CSS).
