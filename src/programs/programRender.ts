import { Flare } from "../core/flare";
import { Vec3 } from "../core/vectors";
import { Atmosphere } from "../core/atmosphere";
import { Camera, FRONT_VIEW } from "../core/camera";
import { SUN_DISC_ANGLE_SIN } from "../core/constants";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Sky } from "../core/sky";
import { mix } from "../core/mathutils";

export class ProgramRender {
  engine: Engine;
  shaderA: Framebuffer;
  shaderB: Framebuffer;
  shaderC: Framebuffer;
  camera: Camera;
  atm: Atmosphere;
  sky: Sky;
  flare1: Flare;
  flare2: Flare;


  skyRefreshTime: number = 0.;

  numSSAOSamples: number = 32;
  SSAOSamples: Vec3[] = [];
  SSAONoise: Vec3[] = [];

  numOfFlares = 2;

  // Shader uniforms

  /** Разрешение текстуры шейдера B */
  uTextureBResolution: WebGLUniformLocation;


  /** Синус углового размера солнца */
  uSunDiscAngleSin: WebGLUniformLocation;
  /** Направление на солнце */
  uSunDirection: WebGLUniformLocation;
  /** Цвет диска солнца */
  uSunDiscColor: WebGLUniformLocation;
  /** Направление на луну */
  uMoonDirection: WebGLUniformLocation;
  /** Цвет диска луны */
  uMoonDiscColor: WebGLUniformLocation;
  /** Цвет неба для окружающего освещения */
  uSkyColor: WebGLUniformLocation;
  
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

  /** Свет фар */
  uHeadLight: WebGLUniformLocation;

  /** Положение сигнальных ракет */
  uFlarePositions: WebGLUniformLocation;
  /** Цвет и интенсивность свечения сигнальных ракет */
  uFlareLights: WebGLUniformLocation;

  /** Ядро выборки (набор векторов в пределах единичной полусферы) для тестирования затененности */
  uSSAOSamples: WebGLUniformLocation;
  /** Режим экрана */
  uScreenMode: WebGLUniformLocation;
  /** Масштаб карты */
  uMapScale: WebGLUniformLocation;

  
  constructor(e: Engine, bufferA: Framebuffer, bufferB: Framebuffer,// bufferC: Framebuffer,
    camera: Camera, atm: Atmosphere, sky: Sky, f1: Flare, f2: Flare) {
    this.engine = e;
    this.shaderA = bufferA;
    this.shaderB = bufferB;
    //this.shaderC = bufferC;
    this.camera = camera;
    this.atm = atm;
    this.sky = sky;
    this.flare1 = f1;
    this.flare2 = f2;
    // Подготовка ядра выборки ()
    for(let i=0; i<this.numSSAOSamples; i++) {
      let scale = i/this.numSSAOSamples;
      scale = mix(0.1, 1., scale*scale);
      this.SSAOSamples.push(new Vec3(
        2.*Math.random()-1.,
        2.*Math.random()-1.,
        Math.random()
      ).normalizeMutable().mulMutable(scale/*Math.random()*/));
    }
    // Подготовка набора случайных векторов для случайных поворотов ядра выборки 
    for(let i=0; i<16; i++) {
      this.SSAONoise.push(new Vec3(
        2.*Math.random()-1.,
        2.*Math.random()-1.,
        0.
      ))
    }

  }

  init(shader: Renderbufer, blueNoiseImg: TexImageSource, milkywayImg: TexImageSource, constellationImg: TexImageSource, grayNoiseImg: TexImageSource) {
    // привязка текстуры из шейдеров A и B
    this.engine.setRenderedTexture(shader.program, this.shaderA.fbTextures[0], 'uTextureProgramA');
    this.engine.setRenderedTexture(shader.program, this.shaderB.fbTextures[0], 'uNormalDepthProgramB');
    this.engine.setRenderedTexture(shader.program, this.shaderB.fbTextures[1], 'uAlbedoProgramB');
    //this.engine.setRenderedTexture(shader.program, this.shaderC.fbTextures[0], 'uNormalDepthProgramC');

    this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);

    const width = this.shaderB.width;
    const height = this.shaderB.height;
    const textureBResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureBResolution');
    this.engine.gl.uniform2f(textureBResolution, width, height);
    const SSAONoiseArray: number[] = [];
    this.SSAONoise.forEach(e=>SSAONoiseArray.push(...e.getArray()));
    this.engine.setTextureWithArray16F(shader.program, 'uTextureSSAONoise', 4, 4, new Float32Array(SSAONoiseArray));
    this.engine.setTexture(shader.program, 'uTextureBlueNoise', blueNoiseImg);
    this.engine.setTexture(shader.program, 'uTextureMilkyway', milkywayImg);
    this.engine.setTexture(shader.program, 'uTextureConstellation', constellationImg);

    this.uSSAOSamples = this.engine.gl.getUniformLocation(shader.program, 'uSSAOSamples');
    const samples: number[] = [];
    this.SSAOSamples.forEach(e=>samples.push(...e.getArray()));
    this.engine.gl.uniform3fv(this.uSSAOSamples, samples);

    this.uCameraPosition = this.engine.gl.getUniformLocation(shader.program, 'uCameraPosition');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');
    this.uTransformMat = this.engine.gl.getUniformLocation(shader.program, 'uTransformMat');
    this.uCameraInShadow = this.engine.gl.getUniformLocation(shader.program, 'uCameraInShadow');

    this.uSkyColor = this.engine.gl.getUniformLocation(shader.program, 'uSkyColor');
    this.uSunDirection = this.engine.gl.getUniformLocation(shader.program, 'uSunDirection');
    this.uSunDiscColor = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscColor');
    this.uMoonDirection = this.engine.gl.getUniformLocation(shader.program, 'uMoonDirection');
    this.uMoonDiscColor = this.engine.gl.getUniformLocation(shader.program, 'uMoonDiscColor');
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

    this.uHeadLight = this.engine.gl.getUniformLocation(shader.program, 'uHeadLight');
    this.uFlarePositions = this.engine.gl.getUniformLocation(shader.program, 'uFlarePositions');
    this.uFlareLights = this.engine.gl.getUniformLocation(shader.program, 'uFlareLights');

    this.uScreenMode = this.engine.gl.getUniformLocation(shader.program, 'uScreenMode');
    this.uMapScale = this.engine.gl.getUniformLocation(shader.program, 'uMapScale');
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

    this.engine.gl.uniform1f(this.uCameraInShadow, cameraInShadow);

    this.engine.gl.uniform3fv(this.uSunDiscColor, this.sky.sunDiscColor.getArray());

    this.engine.gl.uniform3f(this.uHeadLight, this.camera.headLights, this.camera.headLights, this.camera.headLights);

    this.engine.gl.uniform3fv(this.uSunDirection, this.sky.sunDirection.getArray());
    this.engine.gl.uniform3fv(this.uSunDiscColor, this.sky.sunDiscColor.getArray());
    this.engine.gl.uniform3fv(this.uMoonDirection, this.sky.moonDirection.getArray());
    this.engine.gl.uniform3fv(this.uMoonDiscColor, this.sky.moonDiskColor.getArray());
    this.engine.gl.uniform3fv(this.uSkyColor, this.sky.skyColor.getArray());

    const flarePos = [...this.flare1.position.getArray(), ...this.flare2.position.getArray()];
    this.engine.gl.uniform3fv(this.uFlarePositions, flarePos);
    const flareLights = [this.flare1.isVisible ? this.flare1.light : Vec3.ZERO(), this.flare2.isVisible ? this.flare2.light : Vec3.ZERO()];
    this.engine.gl.uniform3fv(this.uFlareLights, [...flareLights[0].getArray(), ...flareLights[1].getArray()]);

    this.engine.gl.uniform2f(this.uScreenMode, this.camera.screenMode, this.camera.mapMode);
    this.engine.gl.uniform1f(this.uMapScale, this.camera.mapScale);

  }

}
