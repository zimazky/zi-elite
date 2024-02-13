import { Atmosphere } from "src/core/Atmosphere/Atmosphere";
import { Camera } from "src/core/camera";
import { SUN_DISC_ANGLE_SIN } from "src/core/constants";
import { Engine, Framebuffer, Renderbufer } from "src/core/engine";
import { Sky } from "src/core/sky";

export class ProgramB {
  engine: Engine;
  bufferInput: Framebuffer;
  camera: Camera;
  atm: Atmosphere;
  sky: Sky;

  // Shader uniforms

  /** Положение камеры */
  uCameraPosition: WebGLUniformLocation | null = null;
  /** Угол объектива камеры по x координате */
  uCameraViewAngle: WebGLUniformLocation | null = null;
  /** Вектор направления камеры */
  uCameraDirection: WebGLUniformLocation | null = null;
  /** Матрица вращения камеры для вершинного шейдера */
  uTransformMat: WebGLUniformLocation | null = null;
  /** Режим экрана */
  uScreenMode: WebGLUniformLocation | null = null;
  /** Масштаб карты */
  uMapScale: WebGLUniformLocation | null = null;

  /** Радиус планеты */
  uPlanetRadius: WebGLUniformLocation | null = null;
  /** Положение центра планеты */
  uPlanetCenter: WebGLUniformLocation | null = null;
  /** Синус углового размера солнца */
  uSunDiscAngleSin: WebGLUniformLocation | null = null;
  /** Направление на солнце */
  uSunDirection: WebGLUniformLocation | null = null;
  

  constructor(e: Engine, bInput: Framebuffer, c: Camera, atm: Atmosphere, sky: Sky) {
    this.engine = e;
    this.bufferInput = bInput;
    this.camera = c;
    this.atm = atm;
    this.sky = sky;
  }

  init(shader: Renderbufer, grayNoiseImg: TexImageSource) {
    
    const texture0 = this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);

    // привязка текстуры из шейдера A
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTextures[0], 'uTextureADepth');
    const textureAResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureAResolution');
    this.engine.gl.uniform2f(textureAResolution, this.bufferInput.width, this.bufferInput.height);

    this.uCameraPosition = this.engine.gl.getUniformLocation(shader.program, 'uCameraPosition');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');
    this.uCameraDirection = this.engine.gl.getUniformLocation(shader.program, 'uCameraDirection');
    this.uTransformMat = this.engine.gl.getUniformLocation(shader.program, 'uTransformMat');

    this.uPlanetRadius = this.engine.gl.getUniformLocation(shader.program, 'uPlanetRadius');
    this.engine.gl.uniform1f(this.uPlanetRadius, this.atm.planetRadius);
    this.uPlanetCenter = this.engine.gl.getUniformLocation(shader.program, 'uPlanetCenter');
    this.engine.gl.uniform3fv(this.uPlanetCenter, this.atm.planetCenter.getArray());

    this.uScreenMode = this.engine.gl.getUniformLocation(shader.program, 'uScreenMode');
    this.uMapScale = this.engine.gl.getUniformLocation(shader.program, 'uMapScale');
    this.uSunDirection = this.engine.gl.getUniformLocation(shader.program, 'uSunDirection');
    this.uSunDiscAngleSin = this.engine.gl.getUniformLocation(shader.program, 'uSunDiscAngleSin');
    this.engine.gl.uniform1f(this.uSunDiscAngleSin, SUN_DISC_ANGLE_SIN);

  }

  update(time: number, timeDelta: number) {
    this.engine.gl.uniform3fv(this.uCameraPosition, this.camera.position.getArray());
    this.engine.gl.uniform3fv(this.uCameraDirection, this.camera.direction.getArray());
    this.engine.gl.uniformMatrix3fv(this.uTransformMat, false, this.camera.transformMat.getArray());

    this.engine.gl.uniform1f(this.uCameraViewAngle, this.camera.viewAngle);
    this.engine.gl.uniform2f(this.uScreenMode, this.camera.screenMode, this.camera.mapMode);
    this.engine.gl.uniform1f(this.uMapScale, this.camera.mapScale);

    this.engine.gl.uniform3fv(this.uSunDirection, this.sky.sunDirection.getArray());

  }

}
