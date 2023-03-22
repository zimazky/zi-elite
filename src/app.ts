import { Atmosphere } from './core/atmosphere';
import { Camera } from './core/camera';
import { SUN_COLOR, SUN_DISC_ANGLE_SIN } from './core/constants';
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
  let cameraInShadowLocation: WebGLUniformLocation; // Признак нахождения камеры в тени

  let sunDirectionLocation: WebGLUniformLocation; // Направление на солнце
  let sunDiscAngleSinLocation: WebGLUniformLocation; // Синус углового размера солнца
  let sunDiscColorLocation: WebGLUniformLocation; // Цвет диска солнца
  let skyColorLocation: WebGLUniformLocation; // Цвет неба

  let headLightLocation: WebGLUniformLocation; // Свет фар

  let skyTransformMatLocation: WebGLUniformLocation; // Матрица вращения небесного свода

  initKeyBuffer();

  const img = await loadImage('textures/gray_noise.png');
  const img2 = await loadImage('textures/blue_noise.png');
  const milkywayImg = await loadImage('textures/milkyway.jpg');
  const tSampler = new TerrainSampler(new NoiseSampler(img));

  const json = localStorage.getItem('data') ?? '{}';
  console.log('localStorage',json);
  const obj = JSON.parse(json);
  let pos = Vec3.ZERO();
  //let pos = new Vec3(0,12000000,0);
  let quat = Quaternion.Identity();
  //if(obj.position !== undefined) pos = new Vec3(obj.position.x, obj.position.y, obj.position.z);
  if(obj.orientation !== undefined) quat = new Quaternion(obj.orientation.x, obj.orientation.y, obj.orientation.z, obj.orientation.w);
  const camera = new Camera(pos, quat, tSampler);
  const atm = new Atmosphere();

  let skyQuat = Quaternion.byAngle(Vec3.I(), 0.5*Math.PI); // поворот небесного свода (плоскости млечного пути) относительно системы координат планеты
  let skyAngle = Math.PI*0.12; // угол наклона оси вращения небесной сферы относительно зенита
  let skyAxis = new Vec3(0., Math.cos(skyAngle), -Math.sin(skyAngle)); // ось вращения небесной сферы
  let skyPeriod = 1200.; // период полного поворота небесной сферы в секундах
  let sunDir0 = new Vec3(0., -Math.sin(skyAngle), -Math.cos(skyAngle));

  e.onProgramInit = (program) => {
    cameraPositionLocation = e.getUniformLocation(program, 'uCameraPosition');
    cameraViewAngleLocation = e.getUniformLocation(program, 'uCameraViewAngle');
    cameraVelocityLocation = e.getUniformLocation(program, 'uCameraVelocity');
    cameraOrientationLocation = e.getUniformLocation(program, 'uCameraQuaternion');
    cameraTransformMatLocation = e.getUniformLocation(program, 'uTransformMat');
    cameraAngularSpeedLocation = e.getUniformLocation(program, 'uCameraRotationSpeed');
    cameraInShadowLocation = e.getUniformLocation(program, 'uCameraInShadow');

    headLightLocation = e.getUniformLocation(program, 'uHeadLight');

    sunDirectionLocation = e.getUniformLocation(program, 'uSunDirection');
    sunDiscColorLocation = e.getUniformLocation(program, 'uSunDiscColor');
    sunDiscAngleSinLocation = e.getUniformLocation(program, 'uSunDiscAngleSin');
    e.gl.uniform1f(sunDiscAngleSinLocation, SUN_DISC_ANGLE_SIN);

    skyTransformMatLocation = e.getUniformLocation(program, 'uSkyTransformMat');
    skyColorLocation = e.getUniformLocation(program, 'uSkyColor');

    screenModeLocation = e.getUniformLocation(program, 'uScreenMode');
    mapScaleLocation = e.getUniformLocation(program, 'uMapScale');

    const texture0 = e.setTexture(program, 'uTextureGrayNoise', img, 0);
    const texture1 = e.setTexture(program, 'uTextureBlueNoise', img2, 1);
    const texture2 = e.setTexture(program, 'uTextureMilkyway', milkywayImg, 2);

    e.gl.activeTexture(e.gl.TEXTURE0);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture0);
    e.gl.activeTexture(e.gl.TEXTURE1);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture1);
    e.gl.activeTexture(e.gl.TEXTURE2);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture2);

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

    const skyQ = Quaternion.byAngle(skyAxis, -2.*Math.PI*(0.15+time/skyPeriod));
    const skyMat = skyQ.qmul(skyQuat).mat3();
    const skyM = [
      skyMat.i.x, skyMat.i.y, skyMat.i.z,
      skyMat.j.x, skyMat.j.y, skyMat.j.z,
      skyMat.k.x, skyMat.k.y, skyMat.k.z,
    ];
    e.gl.uniformMatrix3fv(skyTransformMatLocation, false, skyM);

    const sunDirection = skyQ.rotate(sunDir0).normalize();
    const cameraInShadow = camera.inShadow(atm, camera.position, sunDirection);

    e.gl.uniform3f(sunDirectionLocation, sunDirection.x, sunDirection.y, sunDirection.z);
    e.gl.uniform1f(cameraInShadowLocation, cameraInShadow);

    e.gl.uniform3f(headLightLocation, 100., 100., 100.);


    // Вывод информации на экран с периодичностью 0.5 сек
    if(time>infoRefreshTime) {
      const dt = timeDelta*1000;
      const v = camera.velocity.length();
      const vkmph = v*3.6;
      const width = e.canvas.width.toFixed(0);
      const height = e.canvas.height.toFixed(0);

      // Определение цвета неба и цвета диска солнца
      const pos = new Vec3(camera.position.x, 0., camera.position.z); // положение для которого рассчитываем цвета
      const sunDir = sunDirection.copy();
      if(sunDir.y<0.) sunDir.y = 0.;
      sunDir.normalizeMutable();
      const sunDirScatter = atm.scattering(pos, sunDir, sunDir);
      const sunIntensity = SUN_COLOR.mul(10.);
      const sunColor = sunIntensity.mulEl(sunDirScatter.t).safeNormalize().mulMutable(10.);
      //const sunColor = sunIntensity.mulEl(sunDirScatter.t);
      e.gl.uniform3f(sunDiscColorLocation, sunColor.x, sunColor.y, sunColor.z);
      const skyDirScatter = atm.scattering(pos, Vec3.J(), sunDirection);
      const skyColor = sunIntensity.mulEl(skyDirScatter.t).mulMutable(4.*Math.PI).addMutable(new Vec3(0.002,0.002,0.002));
      e.gl.uniform3f(skyColorLocation, skyColor.x, skyColor.y, skyColor.z);

      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.position.y.toFixed(2)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.z.toFixed(2)}
      sun: ${sunColor.x.toFixed(2)}, ${sunColor.y.toFixed(2)}, ${sunColor.z.toFixed(2)}
      sky: ${skyColor.x.toFixed(2)}, ${skyColor.y.toFixed(2)}, ${skyColor.z.toFixed(2)}`;

      infoRefreshTime = time + 0.5;
    }
    if(time>positionStoreTime) {
      // Сохранение координат в локальнре хранилище каждые 5 секунд
      const dataString = JSON.stringify({ position: camera.position, orientation: camera.orientation });
      localStorage.setItem('data', dataString);
      positionStoreTime = time + 5.;
    }

  }
  
  e.start();
  
}