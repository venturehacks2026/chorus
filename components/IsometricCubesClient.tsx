'use client';

import dynamic from 'next/dynamic';

const IsometricCubes = dynamic(() => import('./IsometricCubes'), { ssr: false });

export default function IsometricCubesClient() {
  return <IsometricCubes />;
}
