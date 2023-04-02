import { GLContext } from "./glcontext";
import { preprocess } from "./shader";


interface OnProgramInit {
  (program: WebGLProgram): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
}

type Framebuffer = {
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
  onProgramInit: OnProgramInit;
  /** Колбэк-функция, вызываемая в цикле перед отрисовкой шейдерной программы */
  onProgramLoop: OnProgramLoop;
  resolutionLocation: WebGLUniformLocation;
  timeLocation: WebGLUniformLocation;
}

type Renderbufer = {
  /** Шейдерная программа */
  program: WebGLProgram;
  /** Колбэк-функция, вызываемая при инициализации шейдерной программы */
  onProgramInit: OnProgramInit;
  /** Колбэк-функция, вызываемая в цикле перед отрисовкой шейдерной программы */
  onProgramLoop: OnProgramLoop;
  resolutionLocation: WebGLUniformLocation;
  timeLocation: WebGLUniformLocation;
}

export class Engine extends GLContext {
  /** Время запуска программы */
  startTime: number;
  /** Текущее время */
  currentTime: number;
  /** Количество текстур */
  textureCount: number = 0;

  framebuffers: Framebuffer[] = [];
  renderbufer: Renderbufer;

  public constructor(elementId?: string) {
    super(elementId);
  }

  /** Добавление промежуточного фреймбуфера с собственной шейдерной программой */
  async addFramebuffer(width: number, height: number, baseUrl: string, vsUrl: string, fsUrl: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}) {

    const vsSource = preprocess(baseUrl,vsUrl);
    const fsSource = preprocess(baseUrl,fsUrl);
    const program = this.createProgram(await vsSource, await fsSource);
    const [framebuffer, fbTexture] = this.createFramebuffer(width, height);
    this.gl.useProgram(program);
    this.createSimplePlaneVertexBuffer();
    this.setVertexBuffer(program, 'aVertexPosition');
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    this.framebuffers.push({
      width, height, program, framebuffer, fbTexture, 
      resolutionLocation, timeLocation,
      onProgramInit: onInit,
      onProgramLoop: onLoop});
  }

  /** Настройка финального рендербуфера */
  async setRenderbuffer(baseUrl: string, vsUrl: string, fsUrl: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}) {

    const vsSource = preprocess(baseUrl,vsUrl);
    const fsSource = preprocess(baseUrl,fsUrl);
    const program = this.createProgram(await vsSource, await fsSource);
    this.gl.useProgram(program);
    this.createSimplePlaneVertexBuffer();
    this.setVertexBuffer(program, 'aVertexPosition');
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    this.renderbufer = {program, resolutionLocation, timeLocation, onProgramInit: onInit, onProgramLoop: onLoop};
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    return source;
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
    const textureLocation = this.gl.getUniformLocation(program, name);
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

  public start() {
    this.resizeCanvasToDisplaySize();

    this.framebuffers.forEach(e=>{
      this.gl.useProgram(e.program);
      e.onProgramInit(e.program); 
    })

    this.gl.useProgram(this.renderbufer.program);
    this.renderbufer.onProgramInit(this.renderbufer.program);

    const fbNum = this.framebuffers.length;
    if(fbNum > 0) {
      this.setRenderedTexture(this.renderbufer.program, this.framebuffers[fbNum-1].fbTexture, 'uTextureProgramA');
    }
    this.startTime = this.currentTime = performance.now()/1000.;

    this.loop();
  }

  private loop(): void {
    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - this.startTime;
    const timeDelta = lCurrentTime - this.currentTime;
    this.currentTime = lCurrentTime;

    // Шейдер A, рендеринг в текстуру
    this.framebuffers.forEach(e => {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, e.framebuffer);
      this.gl.useProgram(e.program);
      this.gl.uniform2f(e.resolutionLocation, e.width, e.height);
      this.gl.uniform2f(e.timeLocation, time, timeDelta);
      e.onProgramLoop(time, timeDelta);
      this.gl.viewport(0, 0, e.width, e.height);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    });

    // Финальный рендер
    this.resizeCanvasToDisplaySize();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.useProgram(this.renderbufer.program);
    this.gl.uniform2f(this.renderbufer.resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.renderbufer.timeLocation, time, timeDelta);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(this.loop.bind(this));
  }
}