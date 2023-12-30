import { Mat4, Vec4 } from "src/shared/libs/vectors";

import { Camera } from "src/core/camera";
import { Engine, Framebuffer, Renderbufer } from "src/core/engine";
import { ObjDoc } from "src/core/loadobj";


/**
 * Программа для отображения полигональных моделей
 */
export class ProgramC {
  engine: Engine;
  camera: Camera;

  aspect: number = 1;

  // Shader uniforms
  uCameraViewAngle: WebGLUniformLocation | null = null;
  uProjectMatrix: WebGLUniformLocation | null = null;
  uTransformMatrix: WebGLUniformLocation | null = null;

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
    const fovy = 2*Math.atan(Math.tan(0.5*this.camera.viewAngle)/this.aspect);
    this.engine.gl.uniformMatrix4fv(
      this.uProjectMatrix, 
      false,
      Mat4.perspectiveGl(fovy, this.aspect, 1, 30000).getArray()
    );

  }


}