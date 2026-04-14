'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Particles
    const PARTICLE_COUNT = 200;
    const geometry = new THREE.IcosahedronGeometry(0.3, 0);
    const particles: THREE.Mesh[] = [];

    const colors = [0x6366f1, 0x8b5cf6, 0x7c3aed, 0x4f46e5];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.2 + Math.random() * 0.4,
        wireframe: Math.random() > 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const scale = 0.4 + Math.random() * 1.2;
      mesh.scale.setScalar(scale);

      // Store drift velocity in userData
      mesh.userData.vx = (Math.random() - 0.5) * 0.01;
      mesh.userData.vy = (Math.random() - 0.5) * 0.008;
      mesh.userData.rx = (Math.random() - 0.5) * 0.008;
      mesh.userData.ry = (Math.random() - 0.5) * 0.008;

      scene.add(mesh);
      particles.push(mesh);
    }

    // Mouse parallax
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Parallax camera shift
      camera.position.x += (mouse.x * 3 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      particles.forEach((p) => {
        p.position.x += p.userData.vx as number;
        p.position.y += p.userData.vy as number;
        p.rotation.x += p.userData.rx as number;
        p.rotation.y += p.userData.ry as number;

        // Wrap around bounds
        if (p.position.x > 40) p.position.x = -40;
        if (p.position.x < -40) p.position.x = 40;
        if (p.position.y > 30) p.position.y = -30;
        if (p.position.y < -30) p.position.y = 30;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
