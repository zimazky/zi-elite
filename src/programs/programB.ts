import { Atmosphere } from "../core/atmosphere";
import { Camera } from "../core/camera";
import { SUN_COLOR, SUN_DISC_ANGLE_SIN } from "../core/constants";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Flare } from "../core/flare";
import { Sky } from "../core/sky";
import { Vec3 } from "../core/vectors";

export class ProgramB {
  engine: Engine;
  bufferInput: Framebuffer;
  camera: Camera;
  atm: Atmosphere;
  sky: Sky;
  flare1: Flare;
  flare2: Flare;
  infoRefreshTime: number = 0;

  // Shader uniforms

  /** (uCameraPosition) Положение камеры xyz, w - высота над поверхностью */
  cameraPositionLocation: WebGLUniformLocation;
  /** (uCameraViewAngle) Угол объектива камеры по x координате */
  cameraViewAngleLocation: WebGLUniformLocation;
  /** (uCameraVelocity) Скорость камеры xyz */
  cameraVelocityLocation: WebGLUniformLocation;
  /** (uCameraDirection) Вектор направления камеры */
  cameraDirectionLocation: WebGLUniformLocation;
  /** (uTransformMat) Матрица вращения камеры для вершинного шейдера */
  cameraTransformMatLocation: WebGLUniformLocation;
  /** (uCameraRotationSpeed) Скорость вращения камеры по осям */
  cameraAngularSpeedLocation: WebGLUniformLocation;
  /** (uScreenMode) Режим экрана */
  screenModeLocation: WebGLUniformLocation;
  /** (uMapScale) Масштаб карты */
  mapScaleLocation: WebGLUniformLocation;
  /** (uCameraInShadow) Признак нахождения камеры в тени */
  cameraInShadowLocation: WebGLUniformLocation;

  /** (uSunDirection) Направление на солнце */
  sunDirectionLocation: WebGLUniformLocation;
  /** (uSunDiscAngleSin) Синус углового размера солнца */
  sunDiscAngleSinLocation: WebGLUniformLocation;
  /** (uSunDiscColor) Цвет диска солнца */
  sunDiscColorLocation: WebGLUniformLocation;
  /** (uSkyColor) Цвет неба для окружающего освещения */
  skyColorLocation: WebGLUniformLocation;
  /** (uBetaRayleigh) Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря */
  betaRayleighLocation: WebGLUniformLocation;
  /** (uBetaMie) Коэффициенты рассеивания Ми для трех частот спектра (rgb) на уровне моря */
  betaMieLocation: WebGLUniformLocation;
  /** (uGMie) Коэффициент фазового рассеивания Ми */
  gMieLocation: WebGLUniformLocation;
  /** 
   * (uScaleHeight) Масштабная высота (высота 50% плотности молекул воздуха)
   *  x - для рассеивания Релея
   *  y - для рассеивания Ми 
   * */
  scaleHeightLocation: WebGLUniformLocation;
  /** (uAtmRadius) Радиус атмосферы */
  atmRadiusLocation: WebGLUniformLocation;
  /** (uPlanetRadius) Радиус планеты */
  planetRadiusLocation: WebGLUniformLocation;
  /** (uPlanetCenter) Положение центра планеты */
  planetCenterLocation: WebGLUniformLocation;

  /** (uHeadLight) Свет фар */
  headLightLocation: WebGLUniformLocation;

  /** (uSkyTransformMat) Матрица вращения небесного свода */
  skyTransformMatLocation: WebGLUniformLocation;
  /** (uConstellationsColor) Подсветка созвездий, 0. - не подсвечивать */
  constellationsColor: WebGLUniformLocation;

  /** (uFlare1Position) Положение 1-ой сигнальной ракеты */
  flare1PositionLocation: WebGLUniformLocation;
  /** (uFlare1Light) Цвет и интенсивность свечения 1-ой сигнальной ракеты */
  flare1LightLocation: WebGLUniformLocation;
  /** (uFlare2Position) Положение 2-ой сигнальной ракеты */
  flare2PositionLocation: WebGLUniformLocation;
  /** (uFlare2Light) Цвет и интенсивность свечения 2-ой сигнальной ракеты */
  flare2LightLocation: WebGLUniformLocation;

  constructor(e: Engine, bInput: Framebuffer, c: Camera, atm: Atmosphere, sky: Sky, f1: Flare, f2: Flare) {
    this.engine = e;
    this.bufferInput = bInput;
    this.camera = c;
    this.atm = atm;
    this.sky = sky;
    this.flare1 = f1;
    this.flare2 = f2;
  }

  init(shader: Renderbufer, grayNoiseImg: TexImageSource, milkywayImg: TexImageSource, constellationImg: TexImageSource) {
    this.cameraPositionLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraPosition');
    this.cameraViewAngleLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');
    this.cameraVelocityLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraVelocity');
    this.cameraDirectionLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraDirection');
    this.cameraTransformMatLocation = this.engine.gl.getUniformLocation(shader.program, 'uTransformMat');
    this.cameraAngularSpeedLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraRotationSpeed');
    this.cameraInShadowLocation = this.engine.gl.getUniformLocation(shader.program, 'uCameraInShadow');

    this.headLightLocation = this.engine.gl.getUniformLocation(shader.program, 'uHeadLight');
    this.flare1PositionLocation = this.engine.gl.getUniformLocation(shader.program, 'uFlare1Position');
    this.flare1LightLocation = this.engine.gl.getUniformLocation(shader.program, 'uFlare1Light');
    this.flare2PositionLocation = this.engine.gl.getUniformLocation(shader.program, 'uFlare2Position');
    this.flare2LightLocation = this.engine.gl.getUniformLocation(shader.program, 'uFlare2Light');

    this.sunDirectionLocation = this.engine.gl.getUniformLocation(shader.program, 'uSunDirection');
    this.sunDiscColorLocation = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscColor');
    this.sunDiscAngleSinLocation = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscAngleSin');
    this.engine.gl.uniform1f(this.sunDiscAngleSinLocation, SUN_DISC_ANGLE_SIN);
    this.betaRayleighLocation = this.engine.gl.getUniformLocation(shader.program, 'uBetaRayleigh');
    this.engine.gl.uniform3fv(this.betaRayleighLocation, this.atm.betaRayleigh.getArray());
    this.betaMieLocation = this.engine.gl.getUniformLocation(shader.program, 'uBetaMie');
    this.engine.gl.uniform3fv(this.betaMieLocation, this.atm.betaMie.getArray());
    this.gMieLocation = this.engine.gl.getUniformLocation(shader.program, 'uGMie');
    this.engine.gl.uniform1f(this.gMieLocation, this.atm.g);
    this.scaleHeightLocation = this.engine.gl.getUniformLocation(shader.program, 'uScaleHeight');
    this.engine.gl.uniform2f(this.scaleHeightLocation, this.atm.heightRayleigh, this.atm.heightMie);
    this.atmRadiusLocation = this.engine.gl.getUniformLocation(shader.program, 'uAtmRadius');
    this.engine.gl.uniform1f(this.atmRadiusLocation, this.atm.radius);
    this.planetRadiusLocation = this.engine.gl.getUniformLocation(shader.program, 'uPlanetRadius');
    this.engine.gl.uniform1f(this.planetRadiusLocation, this.atm.planetRadius);
    this.planetCenterLocation = this.engine.gl.getUniformLocation(shader.program, 'uPlanetCenter');
    this.engine.gl.uniform3fv(this.planetCenterLocation, this.atm.planetCenter.getArray());

    this.skyTransformMatLocation = this.engine.gl.getUniformLocation(shader.program, 'uSkyTransformMat');
    this.skyColorLocation = this.engine.gl.getUniformLocation(shader.program, 'uSkyColor');
    this.constellationsColor = this.engine.gl.getUniformLocation(shader.program, 'uConstellationsColor');

    this.screenModeLocation = this.engine.gl.getUniformLocation(shader.program, 'uScreenMode');
    this.mapScaleLocation = this.engine.gl.getUniformLocation(shader.program, 'uMapScale');

    const texture0 = this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);
    const texture1 = this.engine.setTexture(shader.program, 'uTextureMilkyway', milkywayImg);
    const texture2 = this.engine.setTexture(shader.program, 'uTextureConstellation', constellationImg);
  }

  update(time: number, timeDelta: number) {
    this.engine.gl.uniform4f(this.cameraPositionLocation, 
      this.camera.position.x, this.camera.position.y, this.camera.position.z, this.camera.altitude);
    this.engine.gl.uniform3fv(this.cameraVelocityLocation, this.camera.velocity.getArray());
    this.engine.gl.uniform3fv(this.cameraAngularSpeedLocation, this.camera.angularSpeed.getArray());
    this.engine.gl.uniform3fv(this.cameraDirectionLocation, this.camera.direction.getArray());
    this.engine.gl.uniformMatrix3fv(this.cameraTransformMatLocation, false, this.camera.transformMat.getArray());

    this.engine.gl.uniform1f(this.cameraViewAngleLocation, this.camera.viewAngle);
    this.engine.gl.uniform2f(this.screenModeLocation, this.camera.screenMode, this.camera.mapMode);
    this.engine.gl.uniform1f(this.mapScaleLocation, this.camera.mapScale);

    this.engine.gl.uniformMatrix3fv(this.skyTransformMatLocation, false, this.sky.transformMat.getArray());
    this.engine.gl.uniform1f(this.constellationsColor, this.sky.isShowConstellations ? 1. : 0.);

    const cameraInShadow = this.camera.inShadow(this.atm, this.camera.position, this.sky.sunDirection);

    this.engine.gl.uniform3fv(this.sunDirectionLocation, this.sky.sunDirection.getArray());
    this.engine.gl.uniform1f(this.cameraInShadowLocation, cameraInShadow);

    this.engine.gl.uniform3f(this.headLightLocation, this.camera.headLights, this.camera.headLights, this.camera.headLights);

    if(time>this.infoRefreshTime) {
      const dt = timeDelta*1000;
      // Определение цвета неба и цвета диска солнца
      const pos = new Vec3(this.camera.position.x, 0., this.camera.position.z); // положение для которого рассчитываем цвета
      const sunDir = this.sky.sunDirection.copy();
      if(sunDir.y<0.) sunDir.y = 0.;
      sunDir.normalizeMutable();
      const sunDirScatter = this.atm.scattering(pos, sunDir, sunDir);
      const sunIntensity = SUN_COLOR.mul(20.);
      const sunColorRaw = SUN_COLOR.mulEl(sunDirScatter.t);
      const sunColor = sunIntensity.mulEl(sunDirScatter.t).safeNormalize().mulMutable(2.);
      //const sunColor = sunIntensity.mulEl(sunDirScatter.t);
      this.engine.gl.uniform3f(this.sunDiscColorLocation, sunColor.x, sunColor.y, sunColor.z);

      const oneDivSqrt2 = 1./Math.sqrt(2.);
      // светимость неба по 5-ти точкам
      const skyDirScatter = 
        this.atm.scattering(pos, Vec3.J(), this.sky.sunDirection).t
        .add(this.atm.scattering(pos, new Vec3(oneDivSqrt2, oneDivSqrt2, 0), this.sky.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(-oneDivSqrt2, oneDivSqrt2, 0), this.sky.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(0, oneDivSqrt2, oneDivSqrt2), this.sky.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(0, oneDivSqrt2, -oneDivSqrt2), this.sky.sunDirection).t)
        .div(5.);
      const skyColor = sunIntensity.mulEl(skyDirScatter);//.mulMutable(2.*Math.PI);//.addMutable(new Vec3(0.001,0.001,0.001));
      this.engine.gl.uniform3f(this.skyColorLocation, skyColor.x, skyColor.y, skyColor.z);

      this.infoRefreshTime = time + 0.5;
    }

    this.engine.gl.uniform3fv(this.flare1PositionLocation, this.flare1.position.getArray());
    if(this.flare1.isVisible) this.engine.gl.uniform3fv(this.flare1LightLocation, this.flare1.light.getArray());
    else this.engine.gl.uniform3f(this.flare1LightLocation, 0, 0, 0);

    this.engine.gl.uniform3fv(this.flare2PositionLocation, this.flare2.position.getArray());
    if(this.flare2.isVisible) this.engine.gl.uniform3fv(this.flare2LightLocation, this.flare2.light.getArray());
    else this.engine.gl.uniform3f(this.flare2LightLocation, 0, 0, 0);

  }


}
