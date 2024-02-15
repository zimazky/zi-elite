import { Mat4, Vec4 } from "src/shared/libs/vectors";

import { Camera } from "src/core/camera";
import { Engine, Framebuffer, Renderbufer } from "src/core/engine";

export class ProgramA {
  engine: Engine;
  bufferInput: Framebuffer;
  camera: Camera;
  /** Число треугольников сетки в направлении X */
  numX: number;// = 960;//480;//240;
  /** Число треугольников сетки в направлении Y */
  numY: number; // = 480;//240;//120;

  // Shader uniforms
  uCameraViewAngle: WebGLUniformLocation | null = null;
  uPositionDelta: WebGLUniformLocation | null = null;
  uProjectMatrix: WebGLUniformLocation | null = null;
  uTransformMatrix: WebGLUniformLocation | null = null;
  uTransformMatrixPrev: WebGLUniformLocation | null = null;
  uMaxDistance: WebGLUniformLocation | null = null;

  constructor(e: Engine, bInput: Framebuffer, c: Camera) {
    this.engine = e;
    this.bufferInput = bInput;
    this.camera = c;
    this.numX = Math.ceil(e.canvas.width/2.3);
    this.numY = Math.ceil(e.canvas.height/2.3);
  }

  init(shader: Renderbufer) {
    // привязка текстуры gNormalDepth из шейдера B
    this.engine.setRenderedTexture(shader.program, this.bufferInput.fbTextures[0].primary, 'uTextureBDepth');

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
    this.uMaxDistance = this.engine.gl.getUniformLocation(shader.program, 'uMaxDistance');

    // формирование координат вершин
    const vertices: number[] = [];

    for(let j=0; j<this.numY+1; j++) {
      for(let i=0; i<this.numX+1; i++) {
        vertices.push(-1. + i*2./this.numX);
        vertices.push(-1. + j*2./this.numY);
      }
    }
/*
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
*/
/*
    // формирование индексов вершин для отрисовки методом TRIANGLE с учетом использования кэша post-TnL
    // формируем полосами треугольников по cacheSize вершин в полосе
    // снизу вверх (нижние треугольники обычно ближе)
    const cacheSize = 4; // должно быть четным числом, чтобы можно было сформировать первичные вырожденные треугольники
    const indices: number[] = [];
    for(let stripe=0; stripe<this.numX+1; stripe+=cacheSize) {
      // формирование вырожденных треугольников для заполнения кэша
      for(let i=stripe; i-stripe<cacheSize && i<this.numX; i+=2) {
        indices.push(i   );
        indices.push(i+1 );
        indices.push(i+2 );
      }
      // формирование полосы шириной cacheSize снизу вверх
      //   
      //    4 - 5 - 6  
      //    | \ | \ |  
      //    1 - 2 - 3  
      //
      //    1,2,4  2,5,4  2,3,5  3,6,5

      for(let j=0; j<this.numY; j++) {
        for(let i=stripe; i-stripe<cacheSize && i<this.numX; i++) {
          indices.push(i   + j*(this.numX+1));      //1
          indices.push(i+1 + j*(this.numX+1));      //2
          indices.push(i   + (j+1)*(this.numX+1));  //4

          indices.push(i+1 + j*(this.numX+1));      //2
          indices.push(i+1 + (j+1)*(this.numX+1));  //5
          indices.push(i   + (j+1)*(this.numX+1));  //4
        }
      }
    }
*/
    // формирование индексов вершин для отрисовки методом TRIANGLE с учетом пакетной обработки
    // (на NVIDIA по 32 треугольника или по 96 индексов вершин в пакете)
    // формируем полосами треугольников по 5 вершин в полосе (в пакет попадают блоки по 5x5 вершин)
    // снизу вверх (нижние треугольники обычно ближе)
    const stripeWidth = 4; // Число ячеек сетки в блоке (число вершин в блоке минус 1)
    const indices: number[] = [];
    for(let stripe=0; stripe<this.numX+1; stripe+=stripeWidth) {
      // формирование полосы шириной cacheSize снизу вверх
      //   
      //    4 - 5 - 6  
      //    | \ | \ |  
      //    1 - 2 - 3  
      //
      //    1,2,4  2,5,4  2,3,5  3,6,5

      for(let j=0; j<this.numY; j++) {
        for(let i=stripe; i-stripe<stripeWidth && i<this.numX; i++) {
          indices.push(i   + j*(this.numX+1));      //1
          indices.push(i+1 + j*(this.numX+1));      //2
          indices.push(i   + (j+1)*(this.numX+1));  //4

          indices.push(i+1 + j*(this.numX+1));      //2
          indices.push(i+1 + (j+1)*(this.numX+1));  //5
          indices.push(i   + (j+1)*(this.numX+1));  //4
        }
      }
    }

    // привязка массива вершин
    this.engine.setVertexArray(shader, 'aVertexPosition', vertices, indices, 2);
    shader.clearColor = new Vec4(0, 0, 0, 0);

    shader.isDepthTest = true;
    shader.drawMode = this.engine.gl.TRIANGLES;
  }

  update() {
    const aspect = this.bufferInput.width/this.bufferInput.height;
    const fovy = 2*Math.atan(Math.tan(0.5*this.camera.viewAngle)/aspect);
    this.engine.gl.uniformMatrix4fv(
      this.uProjectMatrix, 
      false,
      Mat4.perspectiveGl(fovy, aspect, 1, 1.2*this.camera.maxDistance).getArray()
    );
    this.engine.gl.uniformMatrix3fv(this.uTransformMatrixPrev, false, this.camera.transformMatPrev.getArray());
    this.engine.gl.uniformMatrix3fv(this.uTransformMatrix, false, this.camera.transformMat.getArray());
    this.engine.gl.uniform3fv(this.uPositionDelta, this.camera.positionDelta.getArray());
    this.engine.gl.uniform1f(this.uCameraViewAngle, this.camera.viewAngle);
    this.engine.gl.uniform1f(this.uMaxDistance, this.camera.maxDistance);
  }

}
