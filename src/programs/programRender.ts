import { Atmosphere } from "../core/atmosphere";
import { Camera, FRONT_VIEW } from "../core/camera";
import { SUN_DISC_ANGLE_SIN } from "../core/constants";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Sky } from "../core/sky";

export class ProgramRender {
  engine: Engine;
  shaderA: Framebuffer;
  shaderB: Framebuffer;
  camera: Camera;
  atm: Atmosphere;
  sky: Sky;

  skyRefreshTime: number = 0.;

  // Shader uniforms

  /** Разрешение текстуры шейдера B */
  uTextureBResolution: WebGLUniformLocation;

  /** Направление на солнце */
  uSunDirection: WebGLUniformLocation;
  /** Синус углового размера солнца */
  uSunDiscAngleSin: WebGLUniformLocation;
  /** Цвет диска солнца */
  uSunDiscColor: WebGLUniformLocation;
  /** Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря */
  uBetaRayleigh: WebGLUniformLocation;
  /** Коэффициенты рассеивания Ми для трех частот спектра (rgb) на уровне моря */
  uBetaMie: WebGLUniformLocation;
  /** Коэффициент фазового рассеивания Ми */
  uGMie: WebGLUniformLocation;
  /** 
   * Масштабная высота (высота 50% плотности молекул воздуха)
   *  x - для рассеивания Релея
   *  y - для рассеивания Ми 
   * */
  uScaleHeight: WebGLUniformLocation;
  /** Радиус атмосферы */
  uAtmRadius: WebGLUniformLocation;
  /** Радиус планеты */
  uPlanetRadius: WebGLUniformLocation;
  /** Положение центра планеты */
  uPlanetCenter: WebGLUniformLocation;

  /** Положение камеры */
  uCameraPosition: WebGLUniformLocation;
  /** Признак нахождения камеры в тени */
  uCameraInShadow: WebGLUniformLocation;
  /** Матрица вращения камеры для вершинного шейдера */
  uTransformMat: WebGLUniformLocation;
  /** Угол объектива камеры по x координате */
  uCameraViewAngle: WebGLUniformLocation;
  /** Матрица вращения небесного свода */
  uSkyTransformMat: WebGLUniformLocation;
  /** Подсветка созвездий, 0. - не подсвечивать */
  uConstellationsColor: WebGLUniformLocation;
  
  
  constructor(e: Engine, bufferA: Framebuffer, bufferB: Framebuffer, camera: Camera, atm: Atmosphere, sky: Sky) {
    this.engine = e;
    this.shaderA = bufferA;
    this.shaderB = bufferB;
    this.camera = camera;
    this.atm = atm;
    this.sky = sky;
  }

  init(shader: Renderbufer, blueNoiseImg: TexImageSource, milkywayImg: TexImageSource, constellationImg: TexImageSource) {
    // привязка текстуры из шейдеров A и B
    this.engine.setRenderedTexture(shader.program, this.shaderA.fbTexture, 'uTextureProgramA');
    this.engine.setRenderedTexture(shader.program, this.shaderB.fbTexture, 'uTextureProgramB');
    const width = this.shaderB.width;
    const height = this.shaderB.height;
    const textureBResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureBResolution');
    this.engine.gl.uniform2f(textureBResolution, width, height);
    const texture1 = this.engine.setTexture(shader.program, 'uTextureBlueNoise', blueNoiseImg);
    const texture2 = this.engine.setTexture(shader.program, 'uTextureMilkyway', milkywayImg);
    const texture3 = this.engine.setTexture(shader.program, 'uTextureConstellation', constellationImg);


    this.uCameraPosition = this.engine.gl.getUniformLocation(shader.program, 'uCameraPosition');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');
    this.uTransformMat = this.engine.gl.getUniformLocation(shader.program, 'uTransformMat');
    this.uCameraInShadow = this.engine.gl.getUniformLocation(shader.program, 'uCameraInShadow');

    this.uSunDirection = this.engine.gl.getUniformLocation(shader.program, 'uSunDirection');
    this.uSunDiscColor = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscColor');
    this.uSunDiscAngleSin = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscAngleSin');
    this.engine.gl.uniform1f(this.uSunDiscAngleSin, SUN_DISC_ANGLE_SIN);
    this.uBetaRayleigh = this.engine.gl.getUniformLocation(shader.program, 'uBetaRayleigh');
    this.engine.gl.uniform3fv(this.uBetaRayleigh, this.atm.betaRayleigh.getArray());
    this.uBetaMie = this.engine.gl.getUniformLocation(shader.program, 'uBetaMie');
    this.engine.gl.uniform3fv(this.uBetaMie, this.atm.betaMie.getArray());
    this.uGMie = this.engine.gl.getUniformLocation(shader.program, 'uGMie');
    this.engine.gl.uniform1f(this.uGMie, this.atm.g);
    this.uScaleHeight = this.engine.gl.getUniformLocation(shader.program, 'uScaleHeight');
    this.engine.gl.uniform2f(this.uScaleHeight, this.atm.heightRayleigh, this.atm.heightMie);
    this.uAtmRadius = this.engine.gl.getUniformLocation(shader.program, 'uAtmRadius');
    this.engine.gl.uniform1f(this.uAtmRadius, this.atm.radius);
    this.uPlanetRadius = this.engine.gl.getUniformLocation(shader.program, 'uPlanetRadius');
    this.engine.gl.uniform1f(this.uPlanetRadius, this.atm.planetRadius);
    this.uPlanetCenter = this.engine.gl.getUniformLocation(shader.program, 'uPlanetCenter');
    this.engine.gl.uniform3fv(this.uPlanetCenter, this.atm.planetCenter.getArray());

    this.uSkyTransformMat = this.engine.gl.getUniformLocation(shader.program, 'uSkyTransformMat');
    this.uConstellationsColor = this.engine.gl.getUniformLocation(shader.program, 'uConstellationsColor');
  }

  update(time: number, timeDelta: number) {

    this.engine.gl.uniform3fv(this.uCameraPosition, this.camera.position.getArray());
    this.engine.gl.uniform1f(this.uCameraViewAngle, this.camera.viewAngle);
    this.engine.gl.uniformMatrix3fv(this.uTransformMat, false, this.camera.transformMat.getArray());

    this.engine.gl.uniformMatrix3fv(this.uSkyTransformMat, false, this.sky.transformMat.getArray());

    this.engine.gl.uniform1f(this.uConstellationsColor, this.sky.isShowConstellations ? 1. : 0.);

    const cameraInShadow = this.camera.screenMode!=FRONT_VIEW
      ? 0.
      : this.camera.inShadow(this.atm, this.camera.position, this.sky.sunDirection);

    this.engine.gl.uniform3fv(this.uSunDirection, this.sky.sunDirection.getArray());
    this.engine.gl.uniform1f(this.uCameraInShadow, cameraInShadow);

    this.engine.gl.uniform3fv(this.uSunDiscColor, this.sky.sunDiscColor.getArray());
  }

}