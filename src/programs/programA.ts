import { Camera } from "../core/camera";
import { Engine, Framebuffer, Renderbufer } from "../core/engine";
import { Mat4, Vec4 } from "../core/vectors";

export class ProgramA {
  engine: Engine;
  bufferInput: Framebuffer;
  camera: Camera;
  /** Число треугольников сетки в направлении X */
  numX: number;// = 960;//480;//240;
  /** Число треугольников сетки в направлении Y */
  numY: number; // = 480;//240;//120;

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
    this.numX = Math.ceil(e.canvas.width/2.3);
    this.numY = Math.ceil(e.canvas.height/2.3);
  }

  init(shader: Renderbufer) {
    // привязка текстуры gNormalDepth из шейдера B
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTextures[0], 'uTextureProgramB');

    // установка разрешения текстуры шейдера B
    const textureBResolution = this.engine.gl.getUniformLocation(shader.program, 'uTextureBResolution');
    this.engine.gl.uniform2f(textureBResolution, this.bufferInput.width, this.bufferInput.height);

    // установка разрешения сетки полигонов
    const uNetResolution = this.engine.gl.getUniformLocation(shader.program, 'uNetResolution');
    this.engine.gl.uniform2f(uNetResolution, this.numX, this.numY);


    this.uProjectMatrix = this.engine.gl.getUniformLocation(shader.program, 'uProjectMatrix');
    this.uTransformMatrix = this.engine.gl.getUniformLocation(shader.program, 'uTransformMatrix');
    this.uTransformMatrixPrev = this.engine.gl.getUniformLocation(shader.program, 'uTransformMatrixPrev');
    this.uPositionDelta = this.engine.gl.getUniformLocation(shader.program, 'uPositionDelta');
    this.uCameraViewAngle = this.engine.gl.getUniformLocation(shader.program, 'uCameraViewAngle');

    // формирование координат вершин
    const vertices: number[] = [];

    for(let j=0; j<this.numY+1; j++) {
      for(let i=0; i<this.numX+1; i++) {
        vertices.push(-1. + i*2./this.numX);
        vertices.push(1. - j*2./this.numY);
      }
    }

    // формирование индексов вершин для отрисовки методом TRIANGLE_STRIP
    const indices: number[] = [];
    for(let j=0; j<this.numY; j++) {
      // слева направо
      for(let i=0; i<this.numX+1; i++) {
        indices.push(i + j*(this.numX+1));
        indices.push(i + (j+1)*(this.numX+1));
      }
      j++;
      if(j>=this.numY) break;
      // справа налево
      for(let i=this.numX; i>=0; i--) {
        indices.push(i + j*(this.numX+1));
        indices.push(i + (j+1)*(this.numX+1));
      }
    }

    // привязка массива вершин
    this.engine.setVertexArray(shader, 'aVertexPosition', vertices, indices, 2);
    shader.clearColor = new Vec4(0, 0, 0, 0);

    shader.isDepthTest = true;
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
