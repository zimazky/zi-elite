import { Atmosphere } from './core/atmosphere';
import { Camera } from './core/camera';
import { SUN_COLOR, SUN_DISC_ANGLE_SIN } from './core/constants';
import { Engine } from './core/engine'
import { Flare } from './core/flare';
import { initKeyBuffer } from './core/keyboard';
import { NoiseSampler } from './core/noise';
import { Quaternion } from './core/quaternion';
import { Sky } from './core/sky';
import { TerrainSampler } from './core/terrain';
import { Vec3 } from './core/vectors';
import { loadImage } from './utils/loadimg';

//-----------------------------------------------------------------------------
// TODO: 
//   1. Облака
//   2. Наложить ландшафт на сферическую поверхность планеты
//   3. Добавить водные поверхности
//   4. Рендерить в отдельный буфер (с картой расстояний) для последующей постобработки
//   5. Продумать об использовании буфера предыдущего кадра для ускорения рендеринга нового
//   6. Продумать возможность аналитического вычисления нормалей к поверхности
//   7. Правильно расположить небесный свод относительно планеты
//   8. Поправить цвета материалов, структурировать работу с материалами

export default async function main() {

  const divInfo = document.getElementById('info');
  const e = new Engine('glcanvas');
  let infoRefreshTime = 0;
  let positionStoreTime = 0;

  /** (uCameraPosition) Положение камеры xyz, w - высота над поверхностью */
  let cameraPositionLocation: WebGLUniformLocation;
  /** (uCameraViewAngle) Угол объектива камеры по x координате */
  let cameraViewAngleLocation: WebGLUniformLocation;
  /** (uCameraVelocity) Скорость камеры xyz */
  let cameraVelocityLocation: WebGLUniformLocation;
  /** (uCameraDirection) Вектор направления камеры */
  let cameraDirectionLocation: WebGLUniformLocation;
  /** (uTransformMat) Матрица вращения камеры для вершинного шейдера */
  let cameraTransformMatLocation: WebGLUniformLocation;
  /** (uCameraRotationSpeed) Скорость вращения камеры по осям */
  let cameraAngularSpeedLocation: WebGLUniformLocation;
  /** (uScreenMode) Режим экрана */
  let screenModeLocation: WebGLUniformLocation;
  /** (uMapScale) Масштаб карты */
  let mapScaleLocation: WebGLUniformLocation;
  /** (uCameraInShadow) Признак нахождения камеры в тени */
  let cameraInShadowLocation: WebGLUniformLocation;

  /** (uSunDirection) Направление на солнце */
  let sunDirectionLocation: WebGLUniformLocation;
  /** (uSunDiscAngleSin) Синус углового размера солнца */
  let sunDiscAngleSinLocation: WebGLUniformLocation;
  /** (uSunDiscColor) Цвет диска солнца */
  let sunDiscColorLocation: WebGLUniformLocation;
  /** (uSkyColor) Цвет неба для окружающего освещения */
  let skyColorLocation: WebGLUniformLocation;
  /** (uBetaRayleigh) Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря */
  let betaRayleighLocation: WebGLUniformLocation;
  /** (uBetaMie) Коэффициенты рассеивания Ми для трех частот спектра (rgb) на уровне моря */
  let betaMieLocation: WebGLUniformLocation;
  /** (uGMie) Коэффициент фазового рассеивания Ми */
  let gMieLocation: WebGLUniformLocation;
  /** 
   * (uScaleHeight) Масштабная высота (высота 50% плотности молекул воздуха)
   *  x - для рассеивания Релея
   *  y - для рассеивания Ми 
   * */
  let scaleHeightLocation: WebGLUniformLocation;
  /** (uAtmRadius) Радиус атмосферы */
  let atmRadiusLocation: WebGLUniformLocation;
  /** (uPlanetRadius) Радиус планеты */
  let planetRadiusLocation: WebGLUniformLocation;
  /** (uPlanetCenter) Положение центра планеты */
  let planetCenterLocation: WebGLUniformLocation;

  /** (uHeadLight) Свет фар */
  let headLightLocation: WebGLUniformLocation;

  /** (uSkyTransformMat) Матрица вращения небесного свода */
  let skyTransformMatLocation: WebGLUniformLocation;
  /** (uConstellationsColor) Подсветка созвездий, 0. - не подсвечивать */
  let constellationsColor: WebGLUniformLocation;

  /** (uFlare1Position) Положение 1-ой сигнальной ракеты */
  let flare1PositionLocation: WebGLUniformLocation;
  /** (uFlare1Light) Цвет и интенсивность свечения 1-ой сигнальной ракеты */
  let flare1LightLocation: WebGLUniformLocation;
  /** (uFlare2Position) Положение 2-ой сигнальной ракеты */
  let flare2PositionLocation: WebGLUniformLocation;
  /** (uFlare2Light) Цвет и интенсивность свечения 2-ой сигнальной ракеты */
  let flare2LightLocation: WebGLUniformLocation;

  initKeyBuffer();

  const grayNoiseImg = await loadImage('textures/gray_noise.png');
  const blueNoiseImg = await loadImage('textures/blue_noise.png');
  const milkywayImg = await loadImage('textures/starmap_2020_16k_gal.jpg');
  const constellationImg = await loadImage('textures/constellation_figures_8k_gal.jpg');
  
  const tSampler = new TerrainSampler(new NoiseSampler(grayNoiseImg));

  const json = localStorage.getItem('ziEliteData') ?? '{}';
  console.log('localStorage', json);
  const obj = JSON.parse(json);
  
  // одна из предустановленных точек
  let pos = new Vec3(2316,0,7696);
  let quat = new Quaternion(0,-0.9908125427905498,0,0.13524239368232574);

  //let pos = Vec3.ZERO();
  //let pos = new Vec3(0,12000000,0);
  //let quat = Quaternion.Identity();
  //if(obj.position !== undefined) pos = new Vec3(obj.position.x, obj.position.y, obj.position.z);
  //if(obj.orientation !== undefined) quat = new Quaternion(obj.orientation.x, obj.orientation.y, obj.orientation.z, obj.orientation.w);
  const camera = new Camera(pos, quat, tSampler);
  const atm = new Atmosphere();
  const sky = new Sky();
  const flare1 = new Flare(camera);
  const flare2 = new Flare(camera);

  e.onProgramInit = (program) => {
    cameraPositionLocation = e.gl.getUniformLocation(program, 'uCameraPosition');
    cameraViewAngleLocation = e.gl.getUniformLocation(program, 'uCameraViewAngle');
    cameraVelocityLocation = e.gl.getUniformLocation(program, 'uCameraVelocity');
    cameraDirectionLocation = e.gl.getUniformLocation(program, 'uCameraDirection');
    cameraTransformMatLocation = e.gl.getUniformLocation(program, 'uTransformMat');
    cameraAngularSpeedLocation = e.gl.getUniformLocation(program, 'uCameraRotationSpeed');
    cameraInShadowLocation = e.gl.getUniformLocation(program, 'uCameraInShadow');

    headLightLocation = e.gl.getUniformLocation(program, 'uHeadLight');
    flare1PositionLocation = e.gl.getUniformLocation(program, 'uFlare1Position');
    flare1LightLocation = e.gl.getUniformLocation(program, 'uFlare1Light');
    flare2PositionLocation = e.gl.getUniformLocation(program, 'uFlare2Position');
    flare2LightLocation = e.gl.getUniformLocation(program, 'uFlare2Light');

    sunDirectionLocation = e.gl.getUniformLocation(program, 'uSunDirection');
    sunDiscColorLocation = e.gl.getUniformLocation(program, 'uSunDiscColor');
    sunDiscAngleSinLocation = e.gl.getUniformLocation(program, 'uSunDiscAngleSin');
    e.gl.uniform1f(sunDiscAngleSinLocation, SUN_DISC_ANGLE_SIN);
    betaRayleighLocation = e.gl.getUniformLocation(program, 'uBetaRayleigh');
    e.gl.uniform3f(betaRayleighLocation, atm.betaRayleigh.x, atm.betaRayleigh.y, atm.betaRayleigh.z);
    betaMieLocation = e.gl.getUniformLocation(program, 'uBetaMie');
    e.gl.uniform3f(betaMieLocation, atm.betaMie.x, atm.betaMie.y, atm.betaMie.z);
    gMieLocation = e.gl.getUniformLocation(program, 'uGMie');
    e.gl.uniform1f(gMieLocation, atm.g);
    scaleHeightLocation = e.gl.getUniformLocation(program, 'uScaleHeight');
    e.gl.uniform2f(scaleHeightLocation, atm.heightRayleigh, atm.heightMie);
    atmRadiusLocation = e.gl.getUniformLocation(program, 'uAtmRadius');
    e.gl.uniform1f(atmRadiusLocation, atm.radius);
    planetRadiusLocation = e.gl.getUniformLocation(program, 'uPlanetRadius');
    e.gl.uniform1f(planetRadiusLocation, atm.planetRadius);
    planetCenterLocation = e.gl.getUniformLocation(program, 'uPlanetCenter');
    e.gl.uniform3f(planetCenterLocation, atm.planetCenter.x, atm.planetCenter.y, atm.planetCenter.z);

    skyTransformMatLocation = e.gl.getUniformLocation(program, 'uSkyTransformMat');
    skyColorLocation = e.gl.getUniformLocation(program, 'uSkyColor');
    constellationsColor = e.gl.getUniformLocation(program, 'uConstellationsColor');

    screenModeLocation = e.gl.getUniformLocation(program, 'uScreenMode');
    mapScaleLocation = e.gl.getUniformLocation(program, 'uMapScale');

    const texture0 = e.setTextureWithMIP(program, 'uTextureGrayNoise', grayNoiseImg, 0);
    const texture1 = e.setTexture(program, 'uTextureBlueNoise', blueNoiseImg, 1);
    const texture2 = e.setTexture(program, 'uTextureMilkyway', milkywayImg, 2);
    const texture3 = e.setTexture(program, 'uTextureConstellation', constellationImg, 3);

    e.gl.activeTexture(e.gl.TEXTURE0);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture0);
    e.gl.activeTexture(e.gl.TEXTURE1);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture1);
    e.gl.activeTexture(e.gl.TEXTURE2);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture2);
    e.gl.activeTexture(e.gl.TEXTURE3);
    e.gl.bindTexture(e.gl.TEXTURE_2D, texture3);

  }
  
  e.onProgramLoop = (time, timeDelta) => {
    camera.loopCalculation(time, timeDelta);
    e.gl.uniform4f(cameraPositionLocation, camera.position.x, camera.position.y, camera.position.z, camera.altitude);
    e.gl.uniform3f(cameraVelocityLocation, camera.velocity.x, camera.velocity.y, camera.velocity.z);
    e.gl.uniform3f(cameraAngularSpeedLocation, camera.angularSpeed.x, camera.angularSpeed.y, camera.angularSpeed.z);
    e.gl.uniform3f(cameraDirectionLocation, camera.direction.x, camera.direction.y, camera.direction.z);
    const m = [
      camera.transformMat.i.x, camera.transformMat.i.y, camera.transformMat.i.z,
      camera.transformMat.j.x, camera.transformMat.j.y, camera.transformMat.j.z,
      camera.transformMat.k.x, camera.transformMat.k.y, camera.transformMat.k.z
    ];
    e.gl.uniformMatrix3fv(cameraTransformMatLocation, false, m);

    e.gl.uniform1f(cameraViewAngleLocation, camera.viewAngle);
    e.gl.uniform2f(screenModeLocation, camera.screenMode, camera.mapMode);
    e.gl.uniform1f(mapScaleLocation, camera.mapScale);

    sky.loopCalculation(time, timeDelta);
    const skyM = [
      sky.transformMat.i.x, sky.transformMat.i.y, sky.transformMat.i.z,
      sky.transformMat.j.x, sky.transformMat.j.y, sky.transformMat.j.z,
      sky.transformMat.k.x, sky.transformMat.k.y, sky.transformMat.k.z,
    ];
    e.gl.uniformMatrix3fv(skyTransformMatLocation, false, skyM);
    e.gl.uniform1f(constellationsColor, sky.isShowConstellations ? 1. : 0.);

    const cameraInShadow = camera.inShadow(atm, camera.position, sky.sunDirection);

    e.gl.uniform3f(sunDirectionLocation, sky.sunDirection.x, sky.sunDirection.y, sky.sunDirection.z);
    e.gl.uniform1f(cameraInShadowLocation, cameraInShadow);

    e.gl.uniform3f(headLightLocation, camera.headLights, camera.headLights, camera.headLights);

    // Вывод информации на экран с периодичностью 0.5 сек
    if(time>infoRefreshTime) {
      const dt = timeDelta*1000;
      const v = camera.velocity.length();
      const vkmph = v*3.6;
      const width = e.canvas.width.toFixed(0);
      const height = e.canvas.height.toFixed(0);

      // Определение цвета неба и цвета диска солнца
      const pos = new Vec3(camera.position.x, 0., camera.position.z); // положение для которого рассчитываем цвета
      const sunDir = sky.sunDirection.copy();
      if(sunDir.y<0.) sunDir.y = 0.;
      sunDir.normalizeMutable();
      const sunDirScatter = atm.scattering(pos, sunDir, sunDir);
      const sunIntensity = SUN_COLOR.mul(10.);
      const sunColorRaw = sunIntensity.mulEl(sunDirScatter.t);
      const sunColor = sunIntensity.mulEl(sunDirScatter.t).safeNormalize().mulMutable(10.);
      //const sunColor = sunIntensity.mulEl(sunDirScatter.t);
      e.gl.uniform3f(sunDiscColorLocation, sunColor.x, sunColor.y, sunColor.z);
      const skyDirScatter = atm.scattering(pos, Vec3.J(), sky.sunDirection);
      const skyColor = sunIntensity.mulEl(skyDirScatter.t).mulMutable(8.*Math.PI);//.addMutable(new Vec3(0.001,0.001,0.001));
      e.gl.uniform3f(skyColorLocation, skyColor.x, skyColor.y, skyColor.z);

      divInfo.innerText = `dt: ${dt.toFixed(2)} fps: ${(1000/dt).toFixed(2)} ${width}x${height}
      v: ${v.toFixed(2)}m/s (${vkmph.toFixed(2)}km/h)
      alt: ${camera.altitude.toFixed(2)} h: ${camera.position.y.toFixed(2)}
      x: ${camera.position.x.toFixed(2)} y: ${camera.position.z.toFixed(2)}
      sunR: ${sunColorRaw.x.toFixed(2)}, ${sunColorRaw.y.toFixed(2)}, ${sunColorRaw.z.toFixed(2)}
      sun: ${sunColor.x.toFixed(2)}, ${sunColor.y.toFixed(2)}, ${sunColor.z.toFixed(2)}
      sky: ${skyColor.x.toFixed(2)}, ${skyColor.y.toFixed(2)}, ${skyColor.z.toFixed(2)}`;

      infoRefreshTime = time + 0.5;
    }
    if(time>positionStoreTime) {
      // Сохранение координат в локальное хранилище каждые 5 секунд
      const dataString = JSON.stringify({ position: camera.position, orientation: camera.orientation });
      localStorage.setItem('ziEliteData', dataString);
      positionStoreTime = time + 5.;
    }

    flare1.update(time, timeDelta);
    e.gl.uniform3f(flare1PositionLocation, flare1.position.x, flare1.position.y, flare1.position.z);
    if(flare1.isVisible) e.gl.uniform3f(flare1LightLocation, 1000, 1000, 1000);
    else e.gl.uniform3f(flare1LightLocation, 0, 0, 0);

    flare2.update(time, timeDelta);
    e.gl.uniform3f(flare2PositionLocation, flare2.position.x, flare2.position.y, flare2.position.z);
    if(flare2.isVisible) e.gl.uniform3f(flare2LightLocation, 1000, 1000, 1000);
    else e.gl.uniform3f(flare2LightLocation, 0, 0, 0);

  }
  
  e.start();
  
}