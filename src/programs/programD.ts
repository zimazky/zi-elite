import { Vec2 } from "../core/vectors";
import { Camera } from "../core/camera";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";


/**
 * Программа для построения карты теней
 * также сохраняется карта высот для пинг-понга с шейдером C
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
    this.mapPosition = new Vec2(this.camera.position.x, this.camera.position.z).floor();
  }

  init(shader: Renderbufer) {
    // привязка собственной текстуры uTextureProgramC из шейдера C
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTextures[0], 'uTextureProgramD');

    // установка разрешения текстуры шейдера C
    const textureCResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureDResolution');
    this.engine.gl.uniform2f(textureCResolution, this.bufferInput.width, this.bufferInput.height);

    this.uMapPosition = this.engine.gl.getUniformLocation(shader.program, 'uMapPosition');
    this.engine.gl.uniform2fv(this.uMapPosition, this.mapPosition.getArray());

    this.uScale = this.engine.gl.getUniformLocation(shader.program, 'uScale');
    this.engine.gl.uniform1f(this.uScale, 10000.);
  }

  update(time: number, timeDelta: number) {
    const mapPosDelta = new Vec2(this.camera.position.x, this.camera.position.z).subMutable(this.mapPosition).floor();
    this.engine.gl.uniform2fv(this.uMapPosition, this.mapPosition.getArray());
  }

}