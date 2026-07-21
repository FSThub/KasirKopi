"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Cangkir kopi 3D dekoratif dengan uap beranimasi.
 * Ringan (tanpa React-Three-Fiber), menyesuaikan ukuran kontainer,
 * dan menghormati preferensi "reduce motion".
 */
export default function Coffee3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || 300;
    let height = mount.clientHeight || 180;

    // Scene + kamera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 6.2);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Cahaya
    scene.add(new THREE.AmbientLight(0xfff4e8, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9a6, 0.7);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    // Grup utama (yang berputar)
    const cup = new THREE.Group();
    scene.add(cup);

    const ceramic = new THREE.MeshStandardMaterial({
      color: 0xfaf5ef,
      roughness: 0.35,
      metalness: 0.05,
    });
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c17,
      roughness: 0.2,
      metalness: 0.1,
    });

    // Badan cangkir (agak mengerucut ke bawah)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 0.92, 1.5, 64, 1, false),
      ceramic
    );
    body.position.y = 0.35;
    cup.add(body);

    // Bibir cangkir (torus tipis)
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 16, 64), ceramic);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 1.1;
    cup.add(lip);

    // Permukaan kopi
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), coffeeMat);
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 1.08;
    cup.add(coffee);

    // Gagang cangkir
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 16, 48), ceramic);
    handle.position.set(1.25, 0.45, 0);
    handle.rotation.y = Math.PI / 2;
    cup.add(handle);

    // Tatakan
    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.55, 0.16, 64),
      ceramic
    );
    saucer.position.y = -0.55;
    cup.add(saucer);

    // Uap: beberapa bidang melengkung yang naik dan memudar
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const steamGroup = new THREE.Group();
    steamGroup.position.y = 1.1;
    cup.add(steamGroup);

    const puffs: { mesh: THREE.Mesh; phase: number; x: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4, 1, 8), steamMat.clone());
      const x = (i - 1) * 0.4;
      mesh.position.set(x, 0, 0);
      steamGroup.add(mesh);
      puffs.push({ mesh, phase: i * 0.8, x });
    }

    // Render loop
    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const t = clock.getElapsedTime();

      if (!reduceMotion) {
        cup.rotation.y = t * 0.5;
        cup.position.y = Math.sin(t * 1.2) * 0.06;
      } else {
        cup.rotation.y = -0.4;
      }

      // Animasi uap
      puffs.forEach((p) => {
        const local = ((t * 0.5 + p.phase) % 1.6) / 1.6; // 0..1
        p.mesh.position.y = local * 1.6;
        p.mesh.position.x = p.x + Math.sin(t * 2 + p.phase * 3) * 0.12;
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        // memudar di awal & akhir
        mat.opacity = reduceMotion ? 0.12 : Math.sin(local * Math.PI) * 0.32;
        p.mesh.scale.setScalar(0.7 + local * 0.6);
        p.mesh.lookAt(camera.position);
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    // Responsif
    const onResize = () => {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Bersih-bersih
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
