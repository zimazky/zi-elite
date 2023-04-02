import { GLContext } from "./glcontext";
import { preprocess } from "./shader";


interface OnProgramInit {
  (program: WebGLProgram): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
}

class Framebuffer {
  /** Ширина фреймбуфера */
  width: number;
  /** Высота фреймбуфера */
  height: number;
  /** Шейдерная программа */
  program: WebGLProgram;
  /** Фреймбуфер */
  framebuffer: WebGLFramebuffer;
  /** Текстура фреймбуфера */
  fbTexture: WebGLTexture;
  /** Колбэк-функция, вызываемая при инициализации шейдерной программы */
  onProgramInit: OnProgramInit = (program) => {};
  /** Колбэк-функция, вызываемая в цикле перед отрисовкой шейдерной программы */
  onProgramLoop: OnProgramLoop = (t, dt) => {};
  resolutionLocation: WebGLUniformLocation;
  timeLocation: WebGLUniformLocation;

  constructor(width: number, height: number, 
    program: WebGLProgram, framebuffer: WebGLFramebuffer, fbtexture: WebGLTexture,
    onLoop: OnProgramLoop) {
    this.width = width;
    this.height = height;
    this.program = program;
    this.framebuffer = framebuffer;
    this.fbTexture = fbtexture;
    this.onProgramLoop = onLoop;
  }
}

export class Engine extends GLContext {
  /** Время запуска программы */
  startTime: number;
  /** Текущее время */
  currentTime: number;
  /** Обратный вызов для инициализации программы A */
  onProgramAInit: OnProgramInit = (program) => {};
  /** Обратный вызов для инициализации финальной программы рендеринга */
  onProgramRenderInit: OnProgramInit = (program) => {};
  /** Обратный вызов для обновления данных программ */
  onProgramLoop: OnProgramLoop = (t, dt) => {};
  /** Количество текстур */
  textureCount: number = 0;
  /** Буфер программы A */
  frameBufferA: WebGLFramebuffer;
  textureA: WebGLTexture;
  /** Программа A */
  programA: WebGLProgram;
  /** Программа финального рендеринга */
  programRender: WebGLProgram;
  resolutionALocation: WebGLUniformLocation;
  timeALocation: WebGLUniformLocation;
  resolutionRenderLocation: WebGLUniformLocation;
  timeRenderLocation: WebGLUniformLocation;


  framebuffers: Framebuffer[];

  public constructor(elementId?: string) {
    super(elementId);
  }

  /** Добавление промежуточного фреймбуфера с собственной шейдерной программой */
  async addFramebuffer(width: number, height: number, baseUrl: string, vsUrl: string, fsUrl: string, 
    onInit: OnProgramInit, onLoop: OnProgramLoop) {

    const vsSource = preprocess(baseUrl,vsUrl);
    const fsSource = preprocess(baseUrl,fsUrl);
    const program = this.createProgram(await vsSource, await fsSource);
    const [framebuffer, fbtexture] = this.createFramebuffer(width, height);
    this.createSimplePlaneVertexBuffer();
    this.setVertexBuffer(program, 'aVertexPosition');
    const resolutionLocation = this.gl.getUniformLocation(this.programA, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(this.programA, 'uTime');
    this.framebuffers.push(new Framebuffer(width, height, program, framebuffer, fbtexture, onLoop));
    onInit(program);
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    return source;
  }

  public async start() {

    const vsSourceA = preprocess('shaders/a','vs.glsl');
    const fsSourceA = preprocess('shaders/a','fs.glsl');
    const vsSourceRender = preprocess('shaders/render','vs.glsl');
    const fsSourceRender = preprocess('shaders/render','fs.glsl');

    this.programA = this.createProgram(await vsSourceA, await fsSourceA);
    this.programRender = this.createProgram(await vsSourceRender, await fsSourceRender);

    [this.frameBufferA, this.textureA] = this.createFramebuffer(256,256);

    this.createSimplePlaneVertexBuffer();
    this.setVertexBuffer(this.programA, 'aVertexPosition');
    this.setVertexBuffer(this.programRender, 'aVertexPosition');

    // определение uniform переменных программы A
    this.resolutionALocation = this.gl.getUniformLocation(this.programA, 'uResolution');
    this.timeALocation = this.gl.getUniformLocation(this.programA, 'uTime');
    this.onProgramAInit(this.programA);

    // определение uniform переменных финальной программы рендеринга
    this.resolutionRenderLocation = this.gl.getUniformLocation(this.programRender, 'uResolution');
    this.timeRenderLocation = this.gl.getUniformLocation(this.programRender, 'uTime');
    this.setRenderedTexture(this.programRender, this.textureA, 'uTextureProgramA');
    this.onProgramRenderInit(this.programRender);

    this.startTime = this.currentTime = performance.now()/1000.;

    this.loop();
  }

  /** Создание буфера вершин для простой плоскости */
  createSimplePlaneVertexBuffer() {
    const vertices = [1.0,  1.0, -1.0,  1.0, 1.0, -1.0, -1.0, -1.0];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
  }

  /** Установка буфера вершин */
  setVertexBuffer(program: WebGLProgram, name: string) {
    const vertexPosition = this.gl.getAttribLocation(program, name);
    this.gl.enableVertexAttribArray(vertexPosition);
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
  }

  setRenderedTexture(program: WebGLProgram, texture: WebGLTexture, name: string) {
    const textureLocation = this.gl.getUniformLocation(this.programRender, name);
    this.gl.useProgram(program);
    const n = this.textureCount;
    this.gl.uniform1i(textureLocation, n);
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.textureCount++;
  }

  resizeCanvasToDisplaySize(): void {
    if(this.canvas === undefined) return;
    const width  = window.innerWidth;
    const height = window.innerHeight;
    if(this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width  = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /** Привязка текстуры без генерации данных MIPMAP */
  setTexture(program: WebGLProgram, uname: string, img: TexImageSource): WebGLTexture {
    const texture = this.gl.createTexture();
    const n = this.textureCount;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    // задаём параметры, чтобы можно было отрисовать изображение любого размера
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textureCount++;

    return texture;
  }

  /** Привязка текстуры с генерацией данных MIPMAP */
  setTextureWithMIP(program: WebGLProgram, uname: string, img: TexImageSource): WebGLTexture {
    const texture = this.gl.createTexture();
    const n = this.textureCount;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    // задаём параметры, чтобы можно было отрисовать изображение любого размера
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST_MIPMAP_NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textureCount++;

    return texture;
  }

  private loop(): void {
    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - this.startTime;
    const timeDelta = lCurrentTime - this.currentTime;
    this.currentTime = lCurrentTime;

    // Шейдер A, рендеринг в текстуру
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferA);
    this.gl.useProgram(this.programA);

    this.gl.uniform2f(this.resolutionALocation, 256, 256);
    this.gl.uniform2f(this.timeALocation, time, timeDelta);
    this.onProgramLoop(time, timeDelta);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Финальный рендер
    this.resizeCanvasToDisplaySize();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.useProgram(this.programRender);
    this.gl.uniform2f(this.resolutionRenderLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.timeRenderLocation, time, timeDelta);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.loop.bind(this));
  }
}