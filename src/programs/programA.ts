import { Camera } from "../core/camera";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Mat4, Vec4 } from "../core/vectors";

export class ProgramA {
  engine: Engine;
  bufferInput: Framebuffer;
  camera: Camera;

  // Shader uniforms
  uCameraViewAngle: WebGLUniformLocation;
  uPositionDelta: WebGLUniformLocation;
  uProjectMatrix: WebGLUniformLocation;
  uTransformMatrix: WebGLUniformLocation;
  uTransformMatrixPrev: WebGLUniformLocation;

  constructor(e: Engine, bInput: Framebuffer, c: Camera) {
    this.engine = e;
    this.bufferInput = bInput;
    this.camera = c;
  }

  init(shader: Renderbufer) {
    // привязка текстуры из шейдера B
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTexture, 'uTextureProgramB');

    // установка разрешения текстуры шейдера B
    const textureBResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureBResolution');
    this.engine.gl.uniform2f(textureBResolution, this.bufferInput.width, this.bufferInput.height);
    //this.engine.gl.uniform2f(textureBResolution, 240, 120);

    this.uProjectMatrix = this.engine.gl.getUniformLocation(shader.program, 'uProjectMatrix');
    this.uTransformMatrix = this.engine.gl.getUniformLocation(shader.program, 'uTransformMatrix');
    this.uTransformMatrixPrev = this.engine.gl.getUniformLocation(shader.program, 'uTransformMatrixPrev');
    this.uPositionDelta = this.engine.gl.getUniformLocation(shader.program, 'uPositionDelta');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');

    // формирование координат вершин
    const vertices: number[] = [];
    const numx = 240;
    const numy = 120;

    for(let j=0; j<numy+1; j++) {
      for(let i=0; i<numx+1; i++) {
        vertices.push(-1. + i*2./numx);
        vertices.push(1. - j*2./numy);
      }
    }

    // формирование индексов вершин для отрисовки методом TRIANGLE_STRIP
    const indices: number[] = [];
    for(let j=0; j<numy; j++) {
      // слева направо
      for(let i=0; i<numx+1; i++) {
        indices.push(i + j*(numx+1));
        indices.push(i + (j+1)*(numx+1));
      }
      j++;
      if(j>=numy) break;
      // справа налево
      for(let i=numx; i>=0; i--) {
        indices.push(i + j*(numx+1));
        indices.push(i + (j+1)*(numx+1));
      }
    }

    // привязка массива вершин
    this.engine.setVertexArray(shader, 'aVertexPosition', vertices, indices, 2);
    shader.clearColor = new Vec4(0, 0, 0, 60000);
  }

  update() {
    const aspect = this.bufferInput.width/this.bufferInput.height;
    this.engine.gl.uniformMatrix4fv(
      this.uProjectMatrix, 
      false,
      Mat4.perspectiveProjectMatrix(this.camera.viewAngle, aspect, 0.5, 65000.).getArray()
    );
    //this.engine.gl.uniformMatrix4fv(projectMatrix, false, Mat4.orthoProjectMatrix(-1.,1.,-1.,1.,0.,60000.).getArray());

    this.engine.gl.uniformMatrix3fv(this.uTransformMatrixPrev, false, this.camera.transformMatPrev.getArray());
    this.engine.gl.uniformMatrix3fv(this.uTransformMatrix, false, this.camera.transformMat.getArray());
    this.engine.gl.uniform3fv(this.uPositionDelta, this.camera.positionDelta.getArray());
    this.engine.gl.uniform1f(this.uCameraViewAngle, this.camera.viewAngle);
  }

}
