import { Camera } from './core/camera';
import { Engine } from './core/engine'
import { initKeyBuffer } from './core/keyboard';
import { NoiseSampler } from './core/noise';
import { Quaternion } from './core/quaternion';
import { TerrainSampler } from './core/terrain';
import { Vec3 } from './core/vectors';
import { loadImage } from './utils/loadimg';

export default async function main() {

  const divInfo = document.getElementById('info');
  const e = new Engine('glcanvas');
  let infoRefreshTime = 0;
  let positionStoreTime = 0;

  let cameraPositionLocation: WebGLUniformLocation; // Положение камеры xyz, w - высота над поверхностью
  let cameraViewAngleLocation: WebGLUniformLocation; // Угол объектива камеры по x координате
  let cameraVelocityLocation: WebGLUniformLocation; // Скорость камеры xyz
  let cameraOrientationLocation: WebGLUniformLocation; // Кватернион, определяющий ориентацию камеры
  let cameraTransformMatLocation: WebGLUniformLocation; // Матрица вращения для вершинного шейдера
  let cameraAngularSpeedLocation: WebGLUniformLocation; // Скорость вращения по осям 
  let screenModeLocation: WebGLUniformLocation;
  let mapScaleLocation: WebGLUniformLocation;
  let sunDirectionLocation: WebGLUniformLocation; // Направление на солнце
  let cameraInShadowLocation: WebGLUniformLocation; // Признак нахождения камеры в тени

  initKeyBuffer();

  const img = await loadImage('textures/gray_noise.png');
  const tSampler = new TerrainSampler(new NoiseSampler(img));
  const json = localStorage.getItem('data') ?? '{}';
  console.log('localStorage',json);
  const obj = JSON.parse(json);
  let pos = Vec3.ZERO();
  let quat = Quaternion.Identity();
  if(obj.position !== undefined) pos = new Vec3(obj.position.x, obj.position.y, obj.position.z);
  if(obj.orientation !== undefined) quat = new Quaternion(obj.orientation.x, obj.orientation.y, obj.orientation.z, obj.orientation.w);
  const camera = new Camera(pos, quat, tSampler);

  e.onProgramInit = (program) => {
    cameraPositionLocation = e.getUniformLocation(program, 'uCameraPosition');
    cameraViewAngleLocation = e.getUniformLocation(program, 'uCameraViewAngle');
    cameraVelocityLocation = e.getUniformLocation(program, 'uCameraVelocity');
    cameraOrientationLocation = e.getUniformLocation(program, 'uCameraQuaternion');
    cameraTransformMatLocation = e.getUniformLocation(program, 'uTransformMat');
    cameraAngularSpeedLocation = e.getUniformLocation(program, 'uCameraRotationSpeed');
    cameraInShadowLocation = e.getUniformLocation(program, 'uCameraInShadow');

    sunDirectionLocation = e.getUniformLocation(program, 'uSunDirection');

    screenModeLocation = e.getUniformLocation(program, 'uScreenMode');
    mapScaleLocation = e.getUniformLocation(program, 'uMapScale');

    e.setTexture(program, 'uTexture', img);
  }
  
  e.onProgramLoop = (time, timeDelta) => {
    camera.loopCalculation(time, timeDelta);
    e.gl.uniform4f(cameraPositionLocation, camera.position.x, camera.position.y, camera.position.z, camera.altitude);
    e.gl.uniform3f(cameraVelocityLocation, camera.velocity.x, camera.velocity.y, camera.velocity.z);
    e.gl.uniform3f(cameraAngularSpeedLocation, camera.angularSpeed.x, camera.angularSpeed.y, camera.angularSpeed.z);
    e.gl.uniform4f(cameraOrientationLocation, camera.orientation.x, camera.orientation.y, camera.orientation.z, camera.orientation.w);
    const m = [
      camera.transformMat.i.x, camera.transformMat.i.y, camera.transformMat.i.z,
      camera.transformMat.j.x, camera.transformMat.j.y, camera.transformMat.j.z,
      camera.transformMat.k.x, camera.transformMat.k.y, camera.transformMat.k.z
    ];
    e.gl.uniformMatrix3fv(cameraTransformMatLocation, false, m);

    e.gl.uniform1f(cameraViewAngleLocation, camera.viewAngle);
    e.gl.uniform2f(screenModeLocation, camera.screenMode, camera.mapMode);
    e.gl.uniform1f(mapScaleLocation, camera.mapScale);



    const sunAngle = 0.05*time;
//    const sunDirection = new Vec3(Math.sin(sunAngle),0.4,Math.cos(sunAngle)).normalizeMutable();
    const sunDirection = new Vec3(0.,Math.sin(sunAngle),Math.cos(sunAngle)).normalizeMutable();
    const cameraInShadow = camera.inShadow(sunDirection);

    e.gl.uniform3f(sunDirectionLocation, sunDirection.x, sunDirection.y, sunDirection.z);
    e.gl.uniform1f(cameraInShadowLocation, cameraInShadow);


    // Вывод информации на экран с периодичностью 0.5 сек
    if(time>infoRefreshTime) {
      const dt = timeDelta*1000;
      const v = camera.velocity.length();
      const vkmph = v*3.6;
      const width = e.canvas.width.toFixed(0);
      const height = e.canvas.height.toFixed(0);
      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.position.y.toFixed(2)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.z.toFixed(2)}`;
      infoRefreshTime = time + 0.5;
    }
    // Сохранение координат в локальнре хранилище каждые 5 секунд
    if(time>positionStoreTime) {
      const dataString = JSON.stringify({ position: camera.position, orientation: camera.orientation });
      localStorage.setItem('data', dataString);
      //console.log(dataString);
      positionStoreTime = time + 5.;
    }

    //console.log(camera);
  }
  
  e.start();
  
}