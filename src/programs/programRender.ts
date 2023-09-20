import { mix } from "src/shared/libs/mathutils";
import { Vec3 } from "src/shared/libs/vectors";

import { Flare } from "src/core/flare";
import { Atmosphere } from "src/core/Atmosphere/Atmosphere";
import { Camera, FRONT_VIEW } from "src/core/camera";
import { SUN_DISC_ANGLE_SIN } from "src/core/constants";
import { Engine, Framebuffer, Renderbufer } from "src/core/engine";
import { Sky } from "src/core/sky";

export class ProgramRender {
  engine: Engine;
  shaderA: Framebuffer;
  shaderB: Framebuffer;
  //shaderC: Framebuffer;
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
  uTextureBResolution: WebGLUniformLocation | null = null;


  /** Синус углового размера солнца */
  uSunDiscAngleSin: WebGLUniformLocation | null = null;
  /** Направление на солнце */
  uSunDirection: WebGLUniformLocation | null = null;
  /** Цвет диска солнца */
  uSunDiscColor: WebGLUniformLocation | null = null;
  /** Направление на луну */
  uMoonDirection: WebGLUniformLocation | null = null;
  /** Цвет диска луны */
  uMoonDiscColor: WebGLUniformLocation | null = null;
  
  /** Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря */
  uBetaRayleigh: WebGLUniformLocation | null = null;
  /** Коэффициенты рассеивания Ми для трех частот спектра (rgb) на уровне моря */
  uBetaMie: WebGLUniformLocation | null = null;
  /** Коэффициент фазового рассеивания Ми */
  uGMie: WebGLUniformLocation | null = null;
  /** 
   * Масштабная высота (высота 50% плотности молекул воздуха)
   *  x - для рассеивания Релея
   *  y - для рассеивания Ми 
   * */
  uScaleHeight: WebGLUniformLocation | null = null;
  /** Радиус атмосферы */
  uAtmRadius: WebGLUniformLocation | null = null;
  /** Радиус планеты */
  uPlanetRadius: WebGLUniformLocation | null = null;
  /** Положение центра планеты */
  uPlanetCenter: WebGLUniformLocation | null = null;

  /** Положение камеры */
  uCameraPosition: WebGLUniformLocation | null = null;
  /** Признак нахождения камеры в тени */
  uCameraInShadow: WebGLUniformLocation | null = null;
  /** Матрица вращения камеры для вершинного шейдера */
  uTransformMat: WebGLUniformLocation | null = null;
  /** Угол объектива камеры по x координате */
  uCameraViewAngle: WebGLUniformLocation | null = null;
  /** Матрица вращения небесного свода */
  uSkyTransformMat: WebGLUniformLocation | null = null;
  /** Подсветка созвездий, 0. - не подсвечивать */
  uConstellationsColor: WebGLUniformLocation | null = null;

  /** Свет фар */
  uHeadLight: WebGLUniformLocation | null = null;

  /** Положение сигнальных ракет */
  uFlarePositions: WebGLUniformLocation | null = null;
  /** Цвет и интенсивность свечения сигнальных ракет */
  uFlareLights: WebGLUniformLocation | null = null;

  /** Ядро выборки (набор векторов в пределах единичной полусферы) для тестирования затененности */
  uSSAOSamples: WebGLUniformLocation | null = null;
  /** Режим экрана */
  uScreenMode: WebGLUniformLocation | null = null;
  /** Масштаб карты */
  uMapScale: WebGLUniformLocation | null = null;

  
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
    this.engine.setRenderedTexture(shader.program, this.shaderA.fbTextures[0], 'uTextureADepth');
    this.engine.setRenderedTexture(shader.program, this.shaderB.fbTextures[0], 'uTextureBNormalDepth');
    this.engine.setRenderedTexture(shader.program, this.shaderB.fbTextures[1], 'uTextureBAlbedo');
    //this.engine.setRenderedTexture(shader.program, this.shaderC.fbTextures[0], 'uNormalDepthProgramC');

    this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);
    const texture1 = this.engine.setTextureWithArray16F(shader.program, 'uTextureSkyColor', this.sky.skyColorTable.length/3, 1, this.sky.skyColorTable, {
      wrapS: WebGL2RenderingContext.CLAMP_TO_EDGE,
      wrapT: WebGL2RenderingContext.CLAMP_TO_EDGE
    });
    const texture2 = this.engine.setTextureWithArray16F(shader.program, 'uTextureSunColor', this.sky.sunColorTable.length/3, 1, this.sky.sunColorTable, {
      wrapS: WebGL2RenderingContext.CLAMP_TO_EDGE,
      wrapT: WebGL2RenderingContext.CLAMP_TO_EDGE
    });

    const width = this.shaderB.width;
    const height = this.shaderB.height;
    const textureBResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureBResolution');
    this.engine.gl.uniform2f(textureBResolution, width, height);
    const SSAONoiseArray: number[] = [];
    this.SSAONoise.forEach(e=>SSAONoiseArray.push(...e.getArray()));
    this.engine.setTextureWithArray16F(shader.program, 'uTextureSSAONoise', 4, 4, new Float32Array(SSAONoiseArray), 
    {
      wrapS: WebGL2RenderingContext.REPEAT,
      wrapT: WebGL2RenderingContext.REPEAT
    });
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

    this.engine.gl.uniform3f(this.uHeadLight, this.camera.headLights, this.camera.headLights, this.camera.headLights);

    this.engine.gl.uniform3fv(this.uSunDirection, this.sky.sunDirection.getArray());
    this.engine.gl.uniform3fv(this.uSunDiscColor, this.sky.sunDiscColor.getArray());
    this.engine.gl.uniform3fv(this.uMoonDirection, this.sky.moonDirection.getArray());
    this.engine.gl.uniform3fv(this.uMoonDiscColor, this.sky.moonDiskColor.getArray());

    const flarePos = [...this.flare1.position.getArray(), ...this.flare2.position.getArray()];
    this.engine.gl.uniform3fv(this.uFlarePositions, flarePos);
    const flareLights = [this.flare1.isVisible ? this.flare1.light : Vec3.ZERO, this.flare2.isVisible ? this.flare2.light : Vec3.ZERO];
    this.engine.gl.uniform3fv(this.uFlareLights, [...flareLights[0].getArray(), ...flareLights[1].getArray()]);

    this.engine.gl.uniform2f(this.uScreenMode, this.camera.screenMode, this.camera.mapMode);
    this.engine.gl.uniform1f(this.uMapScale, this.camera.mapScale);

  }

}
