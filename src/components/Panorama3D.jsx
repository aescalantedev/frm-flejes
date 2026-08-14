import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import gsap from 'gsap';
import { Maximize, Minimize, Map, Info, Box } from 'lucide-react';

const normalizeMedida = (m) => {
  if (!m) return '';
  const s = m.replace(/\s+/g, '').toUpperCase();
  const parts = s.split('X');
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (!isNaN(w) && !isNaN(h)) return `${w}X${h}`;
  }
  return s;
};

export default function Panorama3D({ torres, inventario, onSelectTorre, stats, filtroEstado, setFiltroEstado, catalogoCostos = [] }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [activeView, setActiveView] = useState('iso');
  const [focusedTowerData, setFocusedTowerData] = useState(null);
  const [focusedFlejeData, setFocusedFlejeData] = useState(null);
  
  const colors = { disponible: 0x6fb889, parcial: 0xd3aa28, ocupada: 0x6d93a3, sobrestock: 0xb95d5d };

  useEffect(() => {
    if (!mountRef.current) return;
    
    // --- SETUP SCENE ---
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe5ebed);
    scene.fog = new THREE.Fog(0xe5ebed, 250, 700);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.inset = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
    controls.minDistance = 35;
    controls.maxDistance = 230;

    // --- LIGHTS ---
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5c5e5d, 1.8));
    const sun = new THREE.DirectionalLight(0xfffaf0, 2.5);
    sun.position.set(-45, 100, 65);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 130;
    sun.shadow.camera.bottom = -130;
    scene.add(sun);
    
    const fill = new THREE.DirectionalLight(0xe8f0f0, 0.8);
    fill.position.set(80, 45, -80);
    scene.add(fill);

    // --- ENVIRONMENT ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 260),
      new THREE.MeshStandardMaterial({ color: 0x7a7f7d, roughness: 0.9, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const floorGrid = new THREE.GridHelper(300, 60, 0x959997, 0x878b89);
    floorGrid.position.y = 0.02;
    floorGrid.material.opacity = 0.18;
    floorGrid.material.transparent = true;
    scene.add(floorGrid);

    // Safety rails & Lines
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xd4a817, roughness: 0.62, metalness: 0.1 });
    const floorLine = (x, z, w, d = 0.16) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), yellowMat);
      m.position.set(x, 0.04, z);
      scene.add(m);
      return m;
    };

    const railGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd4a817, roughness: 0.55, metalness: 0.15 });
    const fenceX = -105;
    for (let z = -10; z <= 58; z += 7) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 12), railMat);
      post.position.set(fenceX, 1.3, z);
      post.castShadow = true;
      railGroup.add(post);
    }
    for (const y of [1.0, 2.4]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 68, 12), railMat);
      r.rotation.x = Math.PI / 2;
      r.position.set(fenceX, y, 24);
      railGroup.add(r);
    }
    const fenceHorizontal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 185, 12), railMat);
    fenceHorizontal.rotation.z = Math.PI / 2;
    fenceHorizontal.position.set(-12, 1.2, -20);
    railGroup.add(fenceHorizontal);
    for (let x = -105; x <= 80; x += 10) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 12), railMat);
      p.position.set(x, 1.2, -20);
      railGroup.add(p);
    }
    scene.add(railGroup);

    for(let x=-99.5;x<=105;x+=13){floorLine(x,-2.5,.12,8.6);floorLine(x,10.5,.12,8.6)}
    for(let z=-54;z<=37;z+=13){floorLine(-97,z,8.5,.12)}

    // --- BILLBOARD (KPIs) ---
    const bbGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 30, 16), pillarMat);
    p1.position.set(-20, 15, 0); p1.castShadow = true;
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 30, 16), pillarMat);
    p2.position.set(20, 15, 0); p2.castShadow = true;
    
    const bbCanvas = document.createElement('canvas');
    bbCanvas.width = 1024;
    bbCanvas.height = 512;
    const bbCtx = bbCanvas.getContext('2d');
    const bbTex = new THREE.CanvasTexture(bbCanvas);
    bbTex.colorSpace = THREE.SRGBColorSpace;
    
    const screenGeo = new THREE.PlaneGeometry(42, 22);
    const screenMat = new THREE.MeshBasicMaterial({ map: bbTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 30, 0.8);
    screenMesh.userData = { isBillboard: true };
    
    const screenBack = new THREE.Mesh(new THREE.BoxGeometry(44, 24, 1.5), pillarMat);
    screenBack.position.set(0, 30, 0);
    screenBack.castShadow = true;

    bbGroup.add(p1, p2, screenBack, screenMesh);
    bbGroup.position.set(40, 0, -60); // Colocar atrás a la derecha
    bbGroup.rotation.y = -Math.PI / 12; // Girar levemente hacia la cámara
    scene.add(bbGroup);

    // --- MATERIALS & GEOMETRIES FOR DATA ---
    const radioExterior = 2.8, radioInterior = 1.0, alturaRollo = 1.2;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radioExterior, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, radioInterior, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geoRollo = new THREE.ExtrudeGeometry(shape, { depth: alturaRollo, bevelEnabled: false, curveSegments: 48 });
    geoRollo.center();
    geoRollo.rotateX(Math.PI / 2);
    const geoCarton = new THREE.CylinderGeometry(radioInterior, radioInterior, alturaRollo + 0.02, 32);
    const geoCartonTapa = new THREE.CylinderGeometry(radioExterior + 0.05, radioExterior + 0.05, 0.08, 32);
    
    const metalBase = new THREE.MeshStandardMaterial({ color: 0x3f4547, roughness: 0.58, metalness: 0.78, transparent: true });
    const metalTop = new THREE.MeshStandardMaterial({ color: 0x777d7d, roughness: 0.48, metalness: 0.68, transparent: true });
    const metalMixed = new THREE.MeshStandardMaterial({ color: 0xb57053, roughness: 0.58, metalness: 0.78, transparent: true });
    const palletMat = new THREE.MeshStandardMaterial({ color: 0x8a5c2e, roughness: 0.9, metalness: 0, transparent: true });
    const matCarton = new THREE.MeshStandardMaterial({ color: 0xab8663, roughness: 1.0, metalness: 0, transparent: true });

    const makeLabelTexture = (id) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#171b1d';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#d7a916';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, c.width - 10, c.height - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '900 54px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(id, 128, 48);
      return new THREE.CanvasTexture(c);
    };

    const makeTopCartonTexture = (text, isMixed = false) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ab8663';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = isMixed ? '#b57053' : '#171b1d';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(128, 128, 123, 0, Math.PI * 2);
      ctx.stroke();
      ctx.translate(128, 128);
      ctx.fillStyle = '#171b1d';
      ctx.font = '900 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, isMixed ? -20 : 0);
      if (isMixed) {
          ctx.font = '900 28px monospace';
          ctx.fillStyle = '#b57053';
          ctx.fillText('MIXTO', 0, 25);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const makeSideTexture = (text) => {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#b57053';
        ctx.fillRect(0, 0, 512, 64);
        ctx.fillStyle = '#171b1d';
        ctx.font = '900 36px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${text}  -  ${text}  -  ${text}`, 256, 32);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    };

    // --- OPERARIO ---
    const avatar = new THREE.Group();
    const matYellow = new THREE.MeshStandardMaterial({ color: 0xe1b31c, roughness: 0.78 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x25292b, roughness: 0.88 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xc9926b, roughness: 0.85 });
    
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.65, 0.65), matYellow);
    torso.position.y = 1.55; torso.castShadow = true; avatar.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), matSkin);
    head.position.y = 2.75; head.castShadow = true; avatar.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matYellow);
    helmet.position.y = 3.02; helmet.castShadow = true; avatar.add(helmet);
    const pants = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.58), matDark);
    pants.position.y = 0.55; pants.castShadow = true; avatar.add(pants);
    for (const px of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.28), matDark);
      leg.position.set(px, 0.15, 0); leg.castShadow = true; avatar.add(leg);
    }
    scene.add(avatar);
    avatar.position.set(-98, 0.05, 45);

    // --- STATE ENGINE ---
    const engine = {
      scene,
      allTowers: {},
      bases: [],
      allFlejes: [],
      interactables: [screenMesh],
      avatarPath: [],
      avatarMoving: false,
      selectedTowerId: null,
      selectedFlejeMesh: null,
      
      walkTo: (x, z, id) => {
        const target = new THREE.Vector3(x, 0.05, z + 8);
        const start = avatar.position.clone();
        
        if (Math.abs(start.z - target.z) < 1.0) {
            // Misma fila, ir directo
            engine.avatarPath = [start, target.clone()];
        } else {
            // Usar el pasillo/espacio a la derecha de la torre destino
            const gapX = target.x + 6.5; 
            engine.avatarPath = [
                start.clone(),
                new THREE.Vector3(gapX, 0.05, start.z),
                new THREE.Vector3(gapX, 0.05, target.z),
                target.clone()
            ];
        }
        engine.avatarMoving = true;
      },
      
      animateAvatar: () => {
        if (!engine.avatarMoving || engine.avatarPath.length < 2) return;
        const next = engine.avatarPath[1];
        const dir = new THREE.Vector3().subVectors(next, avatar.position);
        const dist = dir.length();
        const speed = 0.75;
        if (dist < 0.8) {
          avatar.position.copy(next);
          engine.avatarPath.shift();
          if (engine.avatarPath.length < 2) engine.avatarMoving = false;
          return;
        }
        dir.normalize();
        avatar.position.addScaledVector(dir, speed);
        avatar.rotation.y = Math.atan2(dir.x, dir.z);
      },      clearSelection: () => {
        setFocusedTowerData(null);
        setFocusedFlejeData(null);
        if (engine.selectedTowerId) {
            const t = engine.allTowers[engine.selectedTowerId];
            if (t) {
                if (t.labelElement) t.labelElement.classList.remove('selected');
                if (t.labelObject && engine.selectedTowerId !== engine.hoveredTowerId) t.labelObject.visible = false;
                if (t.floorId) {
                    t.floorId.material.color.setHex(0xaaaaaa);
                    t.floorId.scale.set(1, 1, 1);
                }
            }
        }
        engine.selectedTowerId = null;
        if (engine.selectedFlejeMesh) {
          engine.selectedFlejeMesh.material = metalBase.clone();
          engine.selectedFlejeMesh = null;
        }
        // Restaurar atenuación
        if (engine.lastCapMaxMap && engine.lastFiltro) {
            engine.updateBaseColors(engine.lastCapMaxMap, engine.lastFiltro);
        }
      },

      selectTower: (id, focus = true) => {
        const t = engine.allTowers[id];
        if (!t) return;
        
        const isAlreadySelected = (engine.selectedTowerId === id);
        
        engine.clearSelection(); 
        engine.selectedTowerId = id;
        
        if (t.labelElement) t.labelElement.classList.add('selected');
        if (t.labelObject) t.labelObject.visible = true;
        if (t.floorId) {
            t.floorId.material.color.set(0xd7a916);
            t.floorId.scale.set(1.08, 1.08, 1.08);
        }
        
        // Caminar
        engine.walkTo(t.x, t.z, id);
        
        // Atenuar las demás torres
        if (engine.lastCapMaxMap && engine.lastFiltro) {
            engine.updateBaseColors(engine.lastCapMaxMap, engine.lastFiltro);
        }

        if (focus) {
          if (isAlreadySelected) {
              // Ya estamos enfocados en esta torre, solo refrescar HUD sin re-animar
              const tData = torres.find(tw => tw.id === id);
              setFocusedTowerData(tData || null);
          } else {
              // Cámara desplazada a la derecha para que la torre quede a la izquierda, libre de la ventana
              gsap.to(camera.position, { x: t.x + 12, y: 15, z: t.z + 32, duration: 1.0, ease: 'power3.inOut' });
              gsap.to(controls.target, { 
                x: t.x + 12, y: 10, z: t.z, 
                duration: 1.0, 
                ease: 'power3.inOut',
                onComplete: () => {
                    const tData = torres.find(tw => tw.id === id);
                    setFocusedTowerData(tData || null);
                }
              });
          }
        } else {
            const tData = torres.find(tw => tw.id === id);
            setFocusedTowerData(tData || null);
        }
      },
      
      setView: (name, duration = 0.9) => {
        const views = {
          iso: { p: [-105, 82, 105], t: [0, 0, -8] },
          top: { p: [0, 150, 1], t: [0, 0, -8] },
          front: { p: [0, 48, 120], t: [0, 5, -8] },
          back: { p: [0, 48, -125], t: [0, 5, -8] },
          left: { p: [-145, 45, -8], t: [0, 5, -8] },
          right: { p: [145, 45, -8], t: [0, 5, -8] }
        };
        const v = views[name];
        if (!v) return;
        engine.clearSelection();
        setActiveView(name);
        gsap.to(camera.position, { x: v.p[0], y: v.p[1], z: v.p[2], duration, ease: 'power2.inOut' });
        gsap.to(controls.target, { x: v.t[0], y: v.t[1], z: v.t[2], duration, ease: 'power2.inOut' });
      },

      // Funciones de creación que usan scene
      makeFloorId: (id, x, z) => {
        const mat = new THREE.MeshBasicMaterial({ map: makeLabelTexture(id), transparent: true });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.075, z);
        m.userData = { torreId: id };
        scene.add(m);
        return m;
      },
      makePallet: (x, z) => {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.38, 6.4), palletMat);
        base.position.y = 0.22; base.castShadow = true; g.add(base);
        for (let dx = -2.2; dx <= 2.2; dx += 2.2) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 6.1), palletMat);
          p.position.set(dx, 0.5, 0); p.castShadow = true; g.add(p);
        }
        for (let dz = -2.2; dz <= 2.2; dz += 2.2) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.22, 0.45), palletMat);
          p.position.set(0, 0.5, dz); p.castShadow = true; g.add(p);
        }
        g.position.set(x, 0, z);
        scene.add(g);
        return g;
      },
      createTower: (tData, x, z) => {
        const id = tData.id;
        const nombre = tData.posicion;
        const base = new THREE.Mesh(
            new THREE.PlaneGeometry(9.2, 9.2),
            new THREE.MeshBasicMaterial({ color: colors.disponible, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
        );
        base.rotation.x = -Math.PI / 2;
        base.position.set(x, 0.055, z);
        base.userData = { torreId: id, esBase: true };
        scene.add(base);
        engine.bases.push(base);
        
        // Location frames
        const s = 4.65;
        floorLine(x, z - s, s * 2, 0.10);
        floorLine(x, z + s, s * 2, 0.10);
        floorLine(x - s, z, 0.10, s * 2);
        floorLine(x + s, z, 0.10, s * 2);
        
        engine.makePallet(x, z);
        const idFloor = engine.makeFloorId(nombre, x, z + 3.7);
        
        // CSS2DObject
        const labelDiv = document.createElement('div');
        labelDiv.className = 'absolute text-[15px] font-black tracking-wide text-white bg-[#171b1d] border-2 border-[#d7a916] px-2 py-0.5 rounded shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:bg-[#d7a916] hover:text-[#171b1d] transition-colors pointer-events-auto';
        labelDiv.textContent = nombre;
        labelDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          engine.selectTower(id);
        });
        const label = new CSS2DObject(labelDiv);
        label.position.set(x, 0.18, z + 3.7);
        label.visible = false;
        scene.add(label);
        
        const topTex = makeTopCartonTexture(tData.nombre_medida, false);
        const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 1.0, metalness: 0, transparent: true });
        const localMatCarton = matCarton.clone();
        const tapaMesh = new THREE.Mesh(geoCartonTapa, [localMatCarton, topMat, localMatCarton]);
        tapaMesh.castShadow = true;
        tapaMesh.receiveShadow = true;
        tapaMesh.visible = false;
        scene.add(tapaMesh);
        
        engine.allTowers[id] = { 
            id, x, z, stack: [], baseMesh: base, 
            labelElement: labelDiv, labelObject: label, floorId: idFloor,
            tapaMesh, topMat, nombre_medida: tData.nombre_medida, isMixed: false
        };
      },
      addFleje: (torreId, flejeData, capMax) => {
        const t = engine.allTowers[torreId];
        if (!t) return;
        const g = new THREE.Group();
        
        const tData = torres.find(tw => tw.id === torreId);
        const m1 = normalizeMedida(flejeData.medida);
        const m2 = tData ? normalizeMedida(tData.nombre_medida) : '';
        const isMixed = m1 && m2 && m1 !== m2;
        
        let metalMats;
        if (isMixed) {
            const topM = metalMixed.clone();
            const sideM = new THREE.MeshStandardMaterial({ map: makeSideTexture(flejeData.medida), roughness: 0.58, metalness: 0.78, transparent: true });
            metalMats = [topM, sideM];
        } else {
            metalMats = metalBase.clone();
        }
        
        const metal = new THREE.Mesh(geoRollo, metalMats);
        metal.castShadow = true; metal.receiveShadow = true;
        const center = new THREE.Mesh(geoCarton, metalTop.clone());
        center.castShadow = true;
        g.add(metal, center);
        
        if (isMixed) {
            const separador = new THREE.Mesh(geoCartonTapa, matCarton.clone());
            separador.position.y = -0.6; // Base del fleje
            separador.receiveShadow = true;
            g.add(separador);
        }
        
        g.userData.isMixed = isMixed;
        const i = t.stack.length;
        const y = 0.72 + i * 1.25;
        g.position.set(t.x, y, t.z);
        const costoValorizado = flejeData.peso * (parseFloat(flejeData.costo_kg_ingreso) || 0);
        metal.userData = { ...flejeData, torreId, esMetal: true, numero: i + 1, costoValorizado };
        g.userData.torreId = torreId;
        
        t.stack.push(g);
        scene.add(g);
        engine.allFlejes.push(metal);
      },
      updateBaseColors: (capMaxMap, filtro = 'todas') => {
          engine.lastCapMaxMap = capMaxMap;
          engine.lastFiltro = filtro;
          
          Object.values(engine.allTowers).forEach(t => {
              const capMax = capMaxMap[t.id] || 5;
              const n = t.stack.length;
              let c = colors.disponible;
              let tipo = 'vacias';
              if (n > capMax) { c = colors.sobrestock; tipo = 'sobre'; }
              else if (n === capMax) { c = colors.ocupada; tipo = 'llenas'; }
              else if (n > 0) { c = colors.parcial; tipo = 'parciales'; }
              
              let isVisible = true;
              if (filtro && filtro !== 'todas') {
                 if (filtro === 'llenas') isVisible = (tipo === 'llenas' || tipo === 'sobre');
                 else isVisible = (tipo === filtro);
              }
              
              // Atenuar todo si hay una torre seleccionada y no es esta
              if (engine.selectedTowerId && engine.selectedTowerId !== t.id) {
                  isVisible = false;
              }
              
              if (isVisible) {
                  t.baseMesh.material.color.setHex(c);
                  t.baseMesh.material.opacity = 0.4;
                  if (t.floorId) t.floorId.material.opacity = 1.0;
              } else {
                  t.baseMesh.material.color.setHex(0xaaaaaa);
                  t.baseMesh.material.opacity = 0.08;
                  if (t.floorId) t.floorId.material.opacity = 0.3;
              }
              
              t.baseMesh.visible = true;
              t.stack.forEach(g => { 
                  g.visible = true; 
                  g.children.forEach(mesh => {
                      if (mesh.isMesh) {
                          if (Array.isArray(mesh.material)) {
                              mesh.material.forEach(m => { m.opacity = isVisible ? 1.0 : 0.15; });
                          } else {
                              mesh.material.opacity = isVisible ? 1.0 : 0.15;
                          }
                      }
                  });
              });
              
              if (n > 0) {
                  const topY = 0.72 + (n - 1) * 1.25 + 0.65;
                  t.tapaMesh.position.set(t.x, topY, t.z);
              } else {
                  t.tapaMesh.position.set(t.x, 0.4, t.z); // Sobre el pallet
              }
              
              t.tapaMesh.visible = true;
              t.tapaMesh.material.forEach(m => {
                  m.opacity = isVisible ? 1.0 : 0.15;
              });
              
              const hasMixed = t.stack.some(g => g.userData.isMixed);
              if (t.isMixed !== hasMixed) {
                  t.isMixed = hasMixed;
                  if (t.topMat.map) t.topMat.map.dispose();
                  t.topMat.map = makeTopCartonTexture(t.nombre_medida, hasMixed);
                  t.topMat.needsUpdate = true;
              }
              
              if (t.floorId) t.floorId.visible = true;
              if (t.labelObject && engine.selectedTowerId !== t.id) t.labelObject.visible = false;
          });
      },
      
      updateBillboard: (statsObj) => {
        if (!statsObj) return;
        bbCtx.fillStyle = '#171b1d'; 
        bbCtx.fillRect(0, 0, bbCanvas.width, bbCanvas.height);
        
        bbCtx.strokeStyle = '#25292b';
        bbCtx.lineWidth = 2;
        for(let i=0; i<=1024; i+=64) { bbCtx.beginPath(); bbCtx.moveTo(i,0); bbCtx.lineTo(i,512); bbCtx.stroke(); }
        for(let j=0; j<=512; j+=64) { bbCtx.beginPath(); bbCtx.moveTo(0,j); bbCtx.lineTo(1024,j); bbCtx.stroke(); }

        bbCtx.textAlign = 'center';
        
        bbCtx.font = '900 48px sans-serif';
        bbCtx.fillStyle = '#d7a916';
        bbCtx.fillText('PANEL DE CONTROL', 512, 70);

        // Stats Render
        const drawStat = (val, lbl, x, y, color) => {
           bbCtx.font = 'bold 72px monospace';
           bbCtx.fillStyle = color;
           bbCtx.fillText(val, x, y);
           bbCtx.font = 'bold 24px sans-serif';
           bbCtx.fillStyle = '#8a9194';
           bbCtx.fillText(lbl, x, y + 45);
        };
        
        drawStat(statsObj.totalTorres || 0, 'TORRES FILTRADAS', 256, 220, '#fff');
        drawStat(statsObj.totalFlejes || 0, 'TOTAL FLEJES', 768, 220, '#fff');
        drawStat(statsObj.pesoFmt || '0', 'PESO TOTAL', 256, 410, '#6fb889');
        drawStat(statsObj.capacidadPromedio || '0%', 'CAPACIDAD PROMEDIO', 768, 410, '#6d93a3');

        bbTex.needsUpdate = true;
      }
    };

    engineRef.current = engine;
    engine.setView('iso', 0);

    // --- INTERACTION (RAYCASTER) ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      const hitFleje = raycaster.intersectObjects(engine.allFlejes)[0];
      if (hitFleje && hitFleje.object.userData.torreId) {
        engine.selectTower(hitFleje.object.userData.torreId, true);
        engine.selectedFlejeMesh = hitFleje.object;
        hitFleje.object.material = new THREE.MeshStandardMaterial({ color: 0xc4a029, roughness: 0.5, metalness: 0.7, transparent: true });
        setFocusedFlejeData(hitFleje.object.userData);
        return;
      }
      
      const hitBase = raycaster.intersectObjects(engine.bases)[0];
      if (hitBase && hitBase.object.userData.torreId) {
        engine.selectTower(hitBase.object.userData.torreId);
        return;
      }

      const hitInteractable = raycaster.intersectObjects(engine.interactables)[0];
      if (hitInteractable && hitInteractable.object.userData.isBillboard) {
        engine.clearSelection();
        setActiveView(null);
        gsap.to(camera.position, { x: 40, y: 30, z: -15, duration: 0.8, ease: 'power2.inOut' });
        gsap.to(controls.target, { x: 40, y: 30, z: -60, duration: 0.8, ease: 'power2.inOut' });
      }
    };
    
    container.addEventListener('click', onClick);

    // --- ANIMATION LOOP ---
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      engine.animateAvatar();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // --- RESIZE HANDLER ---
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('click', onClick);
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
      renderer.dispose();
    };
  }, []); // Solo al montar

  // --- DATA SYNC ---
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !torres || !inventario) return;

    // Remove old objects from scene
    engine.allFlejes.forEach(m => {
        if (m.parent && m.parent.parent) {
            engine.scene.remove(m.parent);
        }
    });
    // Remove bases, floor lines and pallets might be trickier if we don't track them all perfectly.
    // For simplicity, we just clear and rebuild the towers if needed, but since `torres` rarely change dynamically, we only build them once or if they change.
    
    // Si ya creamos las torres, solo actualizamos los flejes.
    // Asumimos que las torres son estáticas. Si cambia la cantidad de torres, limpiamos y reconstruimos.
    if (Object.keys(engine.allTowers).length !== torres.length) {
        // Limpieza profunda (no ideal para prod constante, pero funciona para setup)
        // Lo ideal es tener un renderId, pero por ahora...
        torres.forEach((tData, index) => {
            if (engine.allTowers[tData.id]) return;
            const espaciadoX = 13, espaciadoZ = 13, startX = -90, zFila = -15, startZ = zFila + 4 * espaciadoZ;
            let x, z;
            if (index < 20) {
              let r = Math.floor(index / 4);
              let c = index % 4;
              x = startX + c * espaciadoX;
              z = startZ - r * espaciadoZ;
            } else {
              let i = index - 20;
              // Corregido: empezar desde la columna 4 (después de P20) en lugar de la columna 2
              x = startX + 4 * espaciadoX + i * espaciadoX;
              z = zFila;
            }
            engine.createTower(tData, x, z);
        });
    }

    // Limpiar stacks actuales
    Object.values(engine.allTowers).forEach(t => {
        t.stack.forEach(g => engine.scene.remove(g));
        t.stack = [];
    });
    engine.allFlejes = [];

    // Llenar flejes
    const capMaxMap = {};
    torres.forEach(t => {
        capMaxMap[t.id] = t.cantidad_maxima || 5;
        const flejes = inventario[t.id] || [];
        flejes.forEach(f => {
            engine.addFleje(t.id, f);
        });
    });

    engine.updateBaseColors(capMaxMap, filtroEstado);
    engine.updateBillboard(stats);

  }, [torres, inventario, filtroEstado, stats]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-bg shadow-sm border border-border">
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />
      
      <div className="absolute top-4 right-4 z-10 flex gap-1.5 bg-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-border/50 shadow-lg">
        {['iso', 'top', 'front', 'back', 'left', 'right'].map(view => (
          <button
            key={view}
            onClick={() => {
                setActiveView(view);
                engineRef.current?.setView(view);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-200 uppercase ${
              activeView === view 
                ? 'bg-accent text-[#171b1d] shadow-sm' 
                : 'text-text-muted hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-surface/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-border/50 shadow-lg pointer-events-none">
         <div className="w-8 h-8 bg-accent text-[#171b1d] flex items-center justify-center rounded-lg shadow-sm">
           <Box className="w-4 h-4" />
         </div>
         <div>
           <h3 className="text-sm font-black tracking-tight text-foreground">Vista 3D</h3>
           <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.1em]">Gemelo Digital</p>
         </div>
      </div>

      {/* Ventana HUD Digital para la Torre Enfocada */}
      {focusedTowerData && (
        <div className="absolute right-8 top-1/2 -translate-y-[55%] z-20 w-[360px] bg-surface/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-slideUp">
          <div className="px-6 py-4 border-b border-border/30 flex justify-between items-center bg-bg/30">
            <h3 className="text-2xl font-black text-foreground tracking-tight">{focusedTowerData.posicion}</h3>
            <button 
              onClick={() => {
                engineRef.current?.clearSelection();
                engineRef.current?.setView('iso');
              }}
              className="text-foreground hover:text-white hover:bg-danger/80 transition-colors rounded-full w-8 h-8 flex items-center justify-center cursor-pointer bg-bg/50 border border-border/50 shadow-sm font-bold"
            >
              ✕
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs text-text-muted font-black uppercase tracking-[0.15em] mb-1">Medida General</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black text-accent font-mono leading-none drop-shadow-sm">{focusedTowerData.nombre_medida}</span>
                {(() => {
                  const flejes = inventario[focusedTowerData.id] || [];
                  const isMixed = flejes.some(f => normalizeMedida(f.medida) && normalizeMedida(f.medida) !== normalizeMedida(focusedTowerData.nombre_medida));
                  if (isMixed) return <span className="bg-danger/20 text-danger border border-danger/40 text-xs font-bold px-2 py-1 rounded-md uppercase animate-pulse shadow-sm">Mixta</span>;
                  return null;
                })()}
              </div>
            </div>
            
            <div className="bg-bg/40 p-3 rounded-2xl border border-border/40 text-center shadow-inner">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1">Nombre Completo (Catálogo)</p>
              {(() => {
                  const cat = catalogoCostos.find(c => c.medida_corta === focusedTowerData.nombre_medida || c.medida === focusedTowerData.nombre_medida);
                  const finalGlosa = focusedTowerData.glosa_medida || (cat ? cat.glosa : null);
                  return finalGlosa ? (
                    <p className="text-sm font-bold text-foreground leading-snug tracking-tight">{finalGlosa}</p>
                  ) : (
                    <p className="text-xs text-text-muted italic">No disponible en catálogo</p>
                  );
              })()}
            </div>

            {/* Información del Fleje Seleccionado */}
            {focusedFlejeData && (
              <div className="bg-accent/10 border-2 border-accent/30 p-4 rounded-2xl shadow-inner mt-2 animate-fadeIn">
                <p className="text-[10px] text-accent font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                  Fleje Seleccionado
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider">Número</p>
                    <p className="text-sm font-bold text-foreground font-mono">#{focusedFlejeData.numero || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider">Peso</p>
                    <p className="text-sm font-bold text-foreground font-mono">{focusedFlejeData.peso ? focusedFlejeData.peso.toFixed(2) : '0'} kg</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider">Medida Específica</p>
                    <p className="text-sm font-bold text-foreground font-mono truncate">{focusedFlejeData.medida || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-muted uppercase tracking-wider">Costo Valorizado</p>
                    <p className="text-sm font-bold text-foreground font-mono truncate">
                      S/ {focusedFlejeData.costoValorizado ? focusedFlejeData.costoValorizado.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                if (onSelectTorre) onSelectTorre(focusedTowerData.id);
              }}
              className="w-full bg-accent hover:bg-accent-hover text-[#171b1d] font-black text-sm py-3 rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer uppercase tracking-wide"
            >
              Ver Detalle Completo
            </button>

            {/* Navegación Anterior/Siguiente */}
            <div className="flex gap-3 pt-2">
              {(() => {
                const currentIndex = torres.findIndex(tw => tw.id === focusedTowerData.id);
                const prevTower = currentIndex > 0 ? torres[currentIndex - 1] : torres[torres.length - 1];
                const nextTower = currentIndex < torres.length - 1 ? torres[currentIndex + 1] : torres[0];
                return (
                  <>
                    <button 
                      onClick={() => engineRef.current?.selectTower(prevTower.id, true)} 
                      className="flex-1 bg-bg/50 border border-border py-2 rounded-xl text-text-muted hover:text-foreground font-bold hover:bg-surface-hover text-xs transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <span>«</span> {prevTower.posicion}
                    </button>
                    <button 
                      onClick={() => engineRef.current?.selectTower(nextTower.id, true)} 
                      className="flex-1 bg-bg/50 border border-border py-2 rounded-xl text-text-muted hover:text-foreground font-bold hover:bg-surface-hover text-xs transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      {nextTower.posicion} <span>»</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 z-10 flex gap-2 bg-surface/90 backdrop-blur-md px-3 py-2 rounded-xl border border-border/50 shadow-lg">
         {filtroEstado !== 'todas' && (
           <button
             onClick={() => setFiltroEstado && setFiltroEstado('todas')}
             className="flex items-center text-[10px] font-bold px-2 py-1 rounded-lg text-danger hover:bg-danger/10 transition-all border-r border-border/50 mr-1 pr-3"
           >
             Limpiar Filtro
           </button>
         )}
         {[
           { id: 'vacias', label: 'Vacías', color: '#6fb889' },
           { id: 'parciales', label: 'Parciales', color: '#d3aa28' },
           { id: 'llenas', label: 'Llenas/Sobre', color: '#6d93a3' }
         ].map(item => (
            <button 
              key={item.id}
              onClick={() => setFiltroEstado && setFiltroEstado(prev => prev === item.id ? 'todas' : item.id)}
              className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${filtroEstado === item.id ? 'bg-surface-hover text-foreground shadow-sm' : 'text-text-muted hover:text-foreground hover:bg-surface-hover/50'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span> 
              {item.label}
            </button>
         ))}
      </div>
    </div>
  );
}
