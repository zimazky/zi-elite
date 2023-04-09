import { Atmosphere } from "../core/atmosphere";
import { Camera } from "../core/camera";
import { SUN_DISC_ANGLE_SIN } from "../core/constants";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Flare } from "../core/flare";
import { Sky } from "../core/sky";

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

  /** Положение камеры */
  uCameraPosition: WebGLUniformLocation;
  /** Угол объектива камеры по x координате */
  uCameraViewAngle: WebGLUniformLocation;
  /** Вектор направления камеры */
  uCameraDirection: WebGLUniformLocation;
  /** Матрица вращения камеры для вершинного шейдера */
  uTransformMat: WebGLUniformLocation;
  /** Режим экрана */
  uScreenMode: WebGLUniformLocation;
  /** Масштаб карты */
  uMapScale: WebGLUniformLocation;

  /** Направление на солнце */
  uSunDirection: WebGLUniformLocation;
  /** Синус углового размера солнца */
  uSunDiscAngleSin: WebGLUniformLocation;
  /** Цвет диска солнца */
  uSunDiscColor: WebGLUniformLocation;
  /** Цвет неба для окружающего освещения */
  uSkyColor: WebGLUniformLocation;
  /** Радиус планеты */
  uPlanetRadius: WebGLUniformLocation;
  /** Положение центра планеты */
  uPlanetCenter: WebGLUniformLocation;

  /** Свет фар */
  uHeadLight: WebGLUniformLocation;

  /** Положение 1-ой сигнальной ракеты */
  uFlare1Position: WebGLUniformLocation;
  /** Цвет и интенсивность свечения 1-ой сигнальной ракеты */
  uFlare1Light: WebGLUniformLocation;
  /** Положение 2-ой сигнальной ракеты */
  uFlare2Position: WebGLUniformLocation;
  /** Цвет и интенсивность свечения 2-ой сигнальной ракеты */
  uFlare2Light: WebGLUniformLocation;

  constructor(e: Engine, bInput: Framebuffer, c: Camera, atm: Atmosphere, sky: Sky, f1: Flare, f2: Flare) {
    this.engine = e;
    this.bufferInput = bInput;
    this.camera = c;
    this.atm = atm;
    this.sky = sky;
    this.flare1 = f1;
    this.flare2 = f2;
  }

  init(shader: Renderbufer, grayNoiseImg: TexImageSource) {

    // привязка текстуры из шейдера A
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTexture, 'uTextureProgramA');
    const textureAResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureAResolution');
    this.engine.gl.uniform2f(textureAResolution, this.bufferInput.width, this.bufferInput.height);

    this.uCameraPosition = this.engine.gl.getUniformLocation(shader.program, 'uCameraPosition');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');
    this.uCameraDirection = this.engine.gl.getUniformLocation(shader.program, 'uCameraDirection');
    this.uTransformMat = this.engine.gl.getUniformLocation(shader.program, 'uTransformMat');

    this.uHeadLight = this.engine.gl.getUniformLocation(shader.program, 'uHeadLight');
    this.uFlare1Position = this.engine.gl.getUniformLocation(shader.program, 'uFlare1Position');
    this.uFlare1Light = this.engine.gl.getUniformLocation(shader.program, 'uFlare1Light');
    this.uFlare2Position = this.engine.gl.getUniformLocation(shader.program, 'uFlare2Position');
    this.uFlare2Light = this.engine.gl.getUniformLocation(shader.program, 'uFlare2Light');

    this.uSkyColor = this.engine.gl.getUniformLocation(shader.program, 'uSkyColor');
    this.uSunDirection = this.engine.gl.getUniformLocation(shader.program, 'uSunDirection');
    this.uSunDiscColor = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscColor');
    this.uSunDiscAngleSin = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscAngleSin');
    this.engine.gl.uniform1f(this.uSunDiscAngleSin, SUN_DISC_ANGLE_SIN);
    this.uPlanetRadius = this.engine.gl.getUniformLocation(shader.program, 'uPlanetRadius');
    this.engine.gl.uniform1f(this.uPlanetRadius, this.atm.planetRadius);
    this.uPlanetCenter = this.engine.gl.getUniformLocation(shader.program, 'uPlanetCenter');
    this.engine.gl.uniform3fv(this.uPlanetCenter, this.atm.planetCenter.getArray());

    this.uScreenMode = this.engine.gl.getUniformLocation(shader.program, 'uScreenMode');
    this.uMapScale = this.engine.gl.getUniformLocation(shader.program, 'uMapScale');

    const texture0 = this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);
  }

  update(time: number, timeDelta: number) {
    this.engine.gl.uniform3fv(this.uCameraPosition, this.camera.position.getArray());
    this.engine.gl.uniform3fv(this.uCameraDirection, this.camera.direction.getArray());
    this.engine.gl.uniformMatrix3fv(this.uTransformMat, false, this.camera.transformMat.getArray());

    this.engine.gl.uniform1f(this.uCameraViewAngle, this.camera.viewAngle);
    this.engine.gl.uniform2f(this.uScreenMode, this.camera.screenMode, this.camera.mapMode);
    this.engine.gl.uniform1f(this.uMapScale, this.camera.mapScale);

    this.engine.gl.uniform3f(this.uHeadLight, this.camera.headLights, this.camera.headLights, this.camera.headLights);

    this.engine.gl.uniform3fv(this.uSunDirection, this.sky.sunDirection.getArray());
    this.engine.gl.uniform3fv(this.uSunDiscColor, this.sky.sunDiscColor.getArray());
    this.engine.gl.uniform3fv(this.uSkyColor, this.sky.skyColor.getArray());

    this.engine.gl.uniform3fv(this.uFlare1Position, this.flare1.position.getArray());
    if(this.flare1.isVisible) this.engine.gl.uniform3fv(this.uFlare1Light, this.flare1.light.getArray());
    else this.engine.gl.uniform3f(this.uFlare1Light, 0, 0, 0);

    this.engine.gl.uniform3fv(this.uFlare2Position, this.flare2.position.getArray());
    if(this.flare2.isVisible) this.engine.gl.uniform3fv(this.uFlare2Light, this.flare2.light.getArray());
    else this.engine.gl.uniform3f(this.uFlare2Light, 0, 0, 0);
  }

}
