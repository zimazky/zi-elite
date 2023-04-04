import { GLContext } from "./glcontext";
import { preprocess } from "./shader";


interface OnProgramInit {
  (shader: Renderbufer): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
}

export type Renderbufer = {
  /** Шейдерная программа */
  program: WebGLProgram;
  /** Колбэк-функция, вызываемая при инициализации шейдерной программы */
  onProgramInit: OnProgramInit;
  /** Колбэк-функция, вызываемая в цикле перед отрисовкой шейдерной программы */
  onProgramLoop: OnProgramLoop;
  /** Объект вершинных массивов */
  vertexArray: WebGLVertexArrayObject;
  /** Количество вершин */
  numOfVertices: number;
  /** Признак применения поэлементной отрисовки с помощью gl.drawElements */
  isElementDraw: boolean;
  /** (uResolution) Разрешение */
  resolutionLocation: WebGLUniformLocation;
  /** (uTime) Время */
  timeLocation: WebGLUniformLocation;
}

export type Framebuffer = Renderbufer & {
  /** Ширина фреймбуфера */
  width: number;
  /** Высота фреймбуфера */
  height: number;
  /** Фреймбуфер */
  framebuffer: WebGLFramebuffer;
  /** Текстура фреймбуфера */
  fbTexture: WebGLTexture;
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
  /** Времена выполнения отработки программ */
  renderTimes: number[] = [];

  public constructor(elementId?: string) {
    super(elementId);
  }

  /** Добавление промежуточного фреймбуфера с собственной шейдерной программой */
  async addFramebuffer(width: number, height: number, baseUrl: string, vsUrl: string, fsUrl: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}): Promise<Framebuffer> {

    const vsSource = preprocess(baseUrl,vsUrl);
    const fsSource = preprocess(baseUrl,fsUrl);
    const program = this.createProgram(await vsSource, await fsSource);
    const [framebuffer, fbTexture] = this.createFramebuffer(width, height);
    this.gl.useProgram(program);
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    this.framebuffers.push({
      width, height, program, framebuffer, fbTexture,
      vertexArray: null, numOfVertices: 4, isElementDraw: false,
      resolutionLocation, timeLocation,
      onProgramInit: onInit,
      onProgramLoop: onLoop});
    return this.framebuffers[this.framebuffers.length-1];
  }

  /** Настройка финального рендербуфера */
  async setRenderbuffer(baseUrl: string, vsUrl: string, fsUrl: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}) {

    const vsSource = preprocess(baseUrl,vsUrl);
    const fsSource = preprocess(baseUrl,fsUrl);
    const program = this.createProgram(await vsSource, await fsSource);
    this.gl.useProgram(program);
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    this.renderbufer = {program, vertexArray: null, numOfVertices: 4, isElementDraw: false,
      resolutionLocation, timeLocation, onProgramInit: onInit, onProgramLoop: onLoop};
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    return source;
  }

  /**
   * Создание и инициализация массива вершин для фреймбуфера
   * @param buffer - фреймбуфер
   * @param name - наименование атрибута массива вершин в шейдере
   * @param vertices - массив с координатами вершин
   * @param pointSize - размер элемента вершинных координат, по умолчанию 2 (x, y)
   */
  setVertexArray(buffer: Renderbufer, name: string, vertices: number[], indices: number[], pointSize: number = 2) {
    buffer.vertexArray = this.gl.createVertexArray();
    buffer.numOfVertices = vertices.length/pointSize;
    this.gl.bindVertexArray(buffer.vertexArray);
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    const attributeLocation = this.gl.getAttribLocation(buffer.program, name);
    this.gl.enableVertexAttribArray(attributeLocation);
    this.gl.vertexAttribPointer(attributeLocation, pointSize, this.gl.FLOAT, false, 0, 0);
    if(indices === null) return;
    buffer.isElementDraw = true;
    buffer.numOfVertices = indices.length;
    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), this.gl.STATIC_DRAW);
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

    // По умолчанию во всех буферах используется простая сетка плоскости из 4-ех вершин
    const vertices = [1.0,  1.0, -1.0,  1.0, 1.0, -1.0, -1.0, -1.0];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    // Используется первый массив в дефолтном VAO, независимо от наименования в шейдере
    const vertexPosition = 0; //this.gl.getAttribLocation(program, name);
    this.gl.enableVertexAttribArray(vertexPosition);
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.framebuffers.forEach(e=>{
      this.gl.useProgram(e.program);
      e.onProgramInit(e); 
    })

    this.gl.useProgram(this.renderbufer.program);
    this.renderbufer.onProgramInit(this.renderbufer);

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
      this.gl.bindVertexArray(e.vertexArray);
      this.gl.uniform2f(e.resolutionLocation, e.width, e.height);
      this.gl.uniform2f(e.timeLocation, time, timeDelta);
      this.gl.viewport(0, 0, e.width, e.height);
      if(e.isElementDraw) this.gl.drawElements(this.gl.LINE_STRIP, e.numOfVertices, this.gl.UNSIGNED_INT, 0);
      else this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, e.numOfVertices);
      //console.log(e.numOfVertices);
      e.onProgramLoop(time, timeDelta);
    });

    // Финальный рендер
    this.resizeCanvasToDisplaySize();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.useProgram(this.renderbufer.program);
    this.gl.bindVertexArray(this.renderbufer.vertexArray);
    this.gl.uniform2f(this.renderbufer.resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.renderbufer.timeLocation, time, timeDelta);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if(this.renderbufer.isElementDraw) 
      this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.renderbufer.numOfVertices, this.gl.UNSIGNED_INT, 0);
    else this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.renderbufer.numOfVertices);
    this.renderbufer.onProgramLoop(time, timeDelta);

    requestAnimationFrame(this.loop.bind(this));
  }
}