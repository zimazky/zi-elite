import { Vec2 } from "../core/vectors";
import { Camera } from "../core/camera";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";


/**
 * Программа для построения карты высот с целью ускорения расчета теней
 */
export class ProgramC {
  engine: Engine;
  camera: Camera;
  bufferInput: Framebuffer;

  mapPosition: Vec2;

  // Shader uniforms
  
  /** Положение центра карты высот */
  uMapPosition: WebGLUniformLocation;
  /** Масштаб карты высот (размер от центра карты до края в метрах */
  uScale: WebGLUniformLocation;
  /** 
   * Изменение положения центра карты высот
   * если 0,0 то расчет не нужен;
   * если сдвиг по любой координате больше ширины карты, то полный пересчет;
   * иначе сдвигаем данные и расчитываем недостающие
   */
  uMapPositionDelta: WebGLUniformLocation;


  constructor(e: Engine, c: Camera, bInput: Framebuffer) {
    this.engine = e;
    this.camera = c;
    this.bufferInput = bInput;
  }

  init(shader: Renderbufer, grayNoiseImg: TexImageSource) {

    const texture0 = this.engine.setTextureWithMIP(shader.program, 'uTextureGrayNoise', grayNoiseImg);

    // привязка текстуры uTextureProgramD из шейдера D
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTextures[0], 'uTextureProgramD');

    // установка разрешения текстуры шейдера D
    const textureCResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureDResolution');
    this.engine.gl.uniform2f(textureCResolution, this.bufferInput.width, this.bufferInput.height);

    this.mapPosition = new Vec2(this.camera.position.x, this.camera.position.z).floor()
    this.uMapPosition = this.engine.gl.getUniformLocation(shader.program, 'uMapPosition');
    this.engine.gl.uniform2fv(this.uMapPosition, this.mapPosition.getArray());

    this.uScale = this.engine.gl.getUniformLocation(shader.program, 'uScale');
    this.engine.gl.uniform1f(this.uScale, 2500.);

    this.uMapPositionDelta = this.engine.gl.getUniformLocation(shader.program, 'uMapPositionDelta');
    this.engine.gl.uniform2f(this.uMapPositionDelta, 20000., 0.);
  }

  update(time: number, timeDelta: number) {

    const mapPosDelta = new Vec2(this.camera.position.x, this.camera.position.z).subMutable(this.mapPosition).floor();
    if(mapPosDelta.length() > 100.) {
      this.engine.gl.uniform2fv(this.uMapPosition, this.mapPosition.getArray());
      this.engine.gl.uniform2fv(this.uMapPositionDelta, mapPosDelta.getArray());
      this.mapPosition.addMutable(mapPosDelta).floor();
    }
    else {
      this.engine.gl.uniform2fv(this.uMapPosition, this.mapPosition.getArray());
      this.engine.gl.uniform2f(this.uMapPositionDelta, 0., 0.);
    }
  }

}