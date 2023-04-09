import { Camera } from "src/core/camera";
import { Engine, Renderbufer } from "src/core/engine";


/**
 * Программа для отображения полигональных моделей
 */
export class ProgrammC {
  engine: Engine;
  camera: Camera;

  // Shader uniforms
  uCameraViewAngle: WebGLUniformLocation;
  uProjectMatrix: WebGLUniformLocation;
  uTransformMatrix: WebGLUniformLocation;

  constructor(e: Engine, c: Camera) {
    this.engine = e;
    this.camera = c;
  }

  init(shader: Renderbufer) {
  }

  update() {
  }


}