import { Camera } from "../core/camera";
import { Engine, Framebuffer, Renderbufer } from "src/core/engine";
import { ObjDoc } from "../core/loadobj";
import { Mat4, Vec4 } from "../core/vectors";


/**
 * Программа для отображения полигональных моделей
 */
export class ProgramC {
  engine: Engine;
  camera: Camera;

  aspect: number;

  // Shader uniforms
  uCameraViewAngle: WebGLUniformLocation;
  uProjectMatrix: WebGLUniformLocation;
  uTransformMatrix: WebGLUniformLocation;

  constructor(e: Engine, c: Camera) {
    this.engine = e;
    this.camera = c;
  }

  init(shader: Renderbufer, o: ObjDoc) {
    // привязка массива вершин
    this.engine.setVertexNormalArray(shader, 'aVertexPosition', o.verticies, 'aNormal', o.normals, o.vertexIds, 3);
    shader.clearColor = new Vec4(0, 0, 0, 650000);

    shader.isDepthTest = true;
    shader.drawMode = this.engine.gl.TRIANGLES;

    this.aspect = (shader as Framebuffer).width/(shader as Framebuffer).height;
    this.uProjectMatrix = this.engine.gl.getUniformLocation(shader.program, 'uProjectMatrix');
  }

  update(time: number, timeDelta: number) {
    this.engine.gl.uniformMatrix4fv(
      this.uProjectMatrix, 
      false,
      Mat4.perspectiveProjectMatrix(this.camera.viewAngle, this.aspect, 0.5, 30000.).getArray()
    );

  }


}