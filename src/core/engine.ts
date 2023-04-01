import { GLContext } from "./glcontext";
import { preprocess } from "./shader";


interface OnProgramInit {
  (program: WebGLProgram): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
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
  /** Буфер программы A */
  frameBufferA: WebGLFramebuffer;
  /** Программа A */
  programA: WebGLProgram;
  /** Программа финального рендеринга */
  programRender: WebGLProgram;
  resolutionALocation: WebGLUniformLocation;
  timeALocation: WebGLUniformLocation;
  resolutionRenderLocation: WebGLUniformLocation;
  timeRenderLocation: WebGLUniformLocation;


  public constructor(elementId?: string) {
    super(elementId);
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    return source;
  }

  public async start() {

    // Создание пустой текстуры, в которую будет рендериться первый шейдер
    const targetTextureWidth = 1500;
    const targetTextureHeight = 700;
    const targetTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, targetTexture);
    // Определение формата текстуры
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, targetTextureWidth, targetTextureHeight, 0, this.gl.RGBA, this.gl.FLOAT, null);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    // Создаем и привязываем framebuffer
    this.frameBufferA = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferA);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, targetTexture, 0);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


    const vsSourceA = preprocess('shaders','vsA.glsl');
    const fsSourceA = preprocess('shaders','fsA.glsl');
    const vsSourceRender = preprocess('shaders','vsRender.glsl');
    const fsSourceRender = preprocess('shaders','fsRender.glsl');

    this.programA = this.createProgram(await vsSourceA, await fsSourceA);
    this.gl.useProgram(this.programA);
    const vertices = [
      1.0,  1.0,
     -1.0,  1.0,
      1.0, -1.0,
     -1.0, -1.0,
    ];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    const vertexPosition = this.gl.getAttribLocation(this.programA, "aVertexPosition");
    this.gl.enableVertexAttribArray(vertexPosition);
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);

    // определение uniform переменных программы A
    this.resolutionALocation = this.gl.getUniformLocation(this.programA, 'uResolution');
    this.timeALocation = this.gl.getUniformLocation(this.programA, 'uTime');
    this.onProgramAInit(this.programA);

    // определение uniform переменных финальной программы рендеринга
    this.resolutionRenderLocation = this.gl.getUniformLocation(this.programRender, 'uResolution');
    this.timeRenderLocation = this.gl.getUniformLocation(this.programRender, 'uTime');
    this.onProgramRenderInit(this.programRender);

    this.startTime = this.currentTime = performance.now()/1000.;

    this.loop();
  }

  createBuffer() {
    const vertices = [
      1.0,  1.0,
     -1.0,  1.0,
      1.0, -1.0,
     -1.0, -1.0,
    ];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
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
  setTexture(program: WebGLProgram, uname: string, img: TexImageSource, num: number): WebGLTexture {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    // задаём параметры, чтобы можно было отрисовать изображение любого размера
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    // Tell the shader to use texture unit 0 for u_texture
    this.gl.uniform1i(textureLocation, num);
    
    return texture;
  }

  /** Привязка текстуры с генерацией данных MIPMAP */
  setTextureWithMIP(program: WebGLProgram, uname: string, img: TexImageSource, num: number): WebGLTexture {
    const texture = this.gl.createTexture();
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
    // Tell the shader to use texture unit 0 for u_texture
    this.gl.uniform1i(textureLocation, num);
    
    return texture;
  }


  private loop(): void {
    this.resizeCanvasToDisplaySize();

    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - this.startTime;
    const timeDelta = lCurrentTime - this.currentTime;
    this.currentTime = lCurrentTime;
  
    // задание uniform переменных
    this.gl.uniform2f(this.resolutionALocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.timeALocation, time, timeDelta);
    this.gl.uniform2f(this.resolutionRenderLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.timeRenderLocation, time, timeDelta);

    // задание кастомных uniform переменных
    this.onProgramLoop(time, timeDelta);

    // Отрисовка первого шейдера
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferA);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // TODO


    // Отрисовка второго шейдера
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.loop.bind(this));
  }
}