import React, { useEffect, useMemo, useRef, useCallback, useLayoutEffect, useState } from 'react';

import { useRouter } from 'next/router';
import { Button } from '@charcoal-ui/react';
import styled from 'styled-components';
import { ProgressBar } from '../components/progressBar';
import { loadVRMAnimation } from '../lib/VRMAnimation/loadVRMAnimation';
import { VRMAnimation } from '../lib/VRMAnimation/VRMAnimation';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { useVRM } from '../lib/useVRM';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { PerspectiveCamera, Text } from '@react-three/drei';


const ExternalImage = ({ imageUrl, cameraPositionY }) => {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  texture.minFilter = THREE.LinearFilter;

  return (
    <mesh position={[0, cameraPositionY - 0.09, 0.3]} rotation={[0, 0.23, 0]}>
      <planeGeometry args={[0.08, 0.08]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
};

const AuthorInfo = ({ vrm, cameraPositionY }) => {
  return (
    <Text
      anchorX="left"
      position={[-0.26, cameraPositionY + 0.185, 0.2]}
      rotation={[0, 0.23, 0]}
      fontSize={0.02}
      color="black"
    >
      {`@${vrm.meta.author}`}
    </Text>
  );
};

function SceneSetup() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color('#f5f5f5');
  }, [scene]);

  return null;
}

const Avator = ({ vrm }: { vrm: VRM }) => {
  const vrmaRef = useRef<VRMAnimation>();
  const mixer = useRef<THREE.AnimationMixer>();
  const action = useRef<THREE.AnimationAction>();
  const [show, setShow] = useState(false);

  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }

    if (vrm) {
      vrm.update(delta);
    }
  });

  useEffect(() => {
    const loadAnimation = async () => {
      if (!vrm) return;

      vrmaRef.current = await loadVRMAnimation('/idle_loop.vrma');

      const mixerTmp: THREE.AnimationMixer = new THREE.AnimationMixer(vrm.scene);
      mixer.current = mixerTmp;

      const clip = vrmaRef.current.createAnimationClip(vrm);
      action.current = mixer.current.clipAction(clip);
      action.current.play();

      setShow(true);
    };
    loadAnimation();
  }, [vrm]);

  return show ? <primitive object={vrm.scene}></primitive> : <></>;
};

export default function Model() {
  const router = useRouter();
  const { id, size } = router.query;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { vrm, fetchedSize } = useVRM(id as string);

  const onClickBackToHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const cameraPosition = useMemo(() => {
    if (!vrm) return [0, 1.25, 0.6];
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    return [0, size.y * 0.85, 0.6]; // Adjust the camera position based on the model's height
  }, [vrm]);

    const cameraPositionY = useMemo(() => {
    if (!vrm) return 1.25;
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    return size.y * 0.85;
  }, [vrm]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const resizeCanvas = () => {
      root.style.width = `${String(document.documentElement.clientWidth)}px`;
      root.style.height = `${String(document.documentElement.clientHeight)}px`;
    };
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div ref={rootRef}>
      {vrm == undefined ? (
        <ProgressBarContainer>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressBarText>呼び出しています</ProgressBarText>
          </div>
          <ProgressBar max={+size} value={fetchedSize} />
        </ProgressBarContainer>
      ) : (
        <Canvas style={{ width: '424px', height: '507px' }} pixelRatio={window.devicePixelRatio} flat>
          <PerspectiveCamera makeDefault rotation={[0, 0.23, 0]} position={cameraPosition} />
          <SceneSetup />
          <Avator vrm={vrm} />
          <directionalLight />
          {vrm && <AuthorInfo vrm={vrm} cameraPositionY={cameraPositionY} />}
          <ExternalImage imageUrl="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://hub.vroid.com/characters/5767127652961291349/models/128980381975742254" cameraPositionY={cameraPositionY}/>
        </Canvas>
      )}
      <ButtonContainer>
        <Button fullWidth variant="Primary" onClick={onClickBackToHome}>
          キャラクター選択に戻る
        </Button>
      </ButtonContainer>
    </div>
  );
}

// プログレスバーを真ん中に寄せるため
const ProgressBarContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  grid-template-rows: 22px 4px;
  gap: 16px;
  transform: translate(-50%, -50%);
  width: 208px;
`;

// 「表示中」
const ProgressBarText = styled.p`
  font-size: ${(props) => props.theme.typography.size[14].fontSize}px;
  font-family: 'Noto Sans JP', sans-serif;
  font-weight: 400;
  color: ${(props) => props.theme.color.text2};
  margin: 0px;
`;

// 「キャラクター選択に戻る」ボタン
const ButtonContainer = styled.div`
  position: absolute;
  display: grid;
  bottom: 40px;
  width: 200px;
  left: 50%;
  transform: translate(-50%, 0px);
`;
