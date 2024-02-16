import { Vec4 } from "src/shared/libs/vectors";

import { GLContext, TextureDescription } from "./glcontext";


interface OnProgramInit {
  (shader: Renderbufer): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
}

interface OnUpdate {
  (time: number, timeDelta: number): void;
}

export type FBTexture = {
  /** Основная текстура */
  primary: WebGLTexture;
  /** Вторая текстура для пинг-понга */
  secondary: WebGLTexture;
  /** Признак работы тексуры в режиме пинг-понг */
  isPingPongOn: boolean;
}

export type Renderbufer = {
  /** Шейдерная программа */
  program: WebGLProgram;
  /** Колбэк-функция, вызываемая при инициализации шейдерной программы */
  onProgramInit: OnProgramInit;
  /** Колбэк-функция, вызываемая в цикле перед отрисовкой шейдерной программы */
  onProgramLoop: OnProgramLoop;
  /** Объект вершинных массивов */
  vertexArray: WebGLVertexArrayObject | null;
  /** Количество вершин */
  numOfVertices: number;
  /** Признак применения поэлементной отрисовки с помощью gl.drawElements */
  isElementDraw: boolean;
  /** Признак необходимости проверки глубины при отрисовке */
  isDepthTest: boolean;
  /** Цвет очистки буфера перед отрисовкой, null если очистка не нужна */
  clearColor: Vec4 | null;
  /** Тип элементов отрисовки, по умолчанию gl.TRIANGLE_STRIP */
  drawMode: number;

  /** (uResolution) Разрешение */
  resolutionLocation: WebGLUniformLocation | null;
  /** (uTime) Время */
  timeLocation: WebGLUniformLocation | null;
  /** (uFrame) Номер кадра */
  frameLocation: WebGLUniformLocation | null;
}

export type Framebuffer = Renderbufer & {
  /** Ширина фреймбуфера */
  width: number;
  /** Высота фреймбуфера */
  height: number;
  /** Фреймбуфер */
  framebuffer: WebGLFramebuffer;
  /** Текстура фреймбуфера */
  fbTextures: FBTexture[];
}

export class Engine extends GLContext {
  /** Время запуска программы */
  startTime: number = 0;
  /** Текущее время */
  currentTime: number = 0;
  /** Счетчик фреймов */
  frame: number = 0;
  /** Массив активных текстур */
  textures: WebGLTexture[] = [];

  /** Список фреймбуферов со собственными программами */
  framebuffers: Framebuffer[] = [];
  /** Финальный рендер в canvas */
  renderbufer: Renderbufer | null = null;

  onUpdate: OnUpdate = (t,dt)=>{};

  public constructor(elementId?: string) {
    super(elementId);
  }

  /** Добавление промежуточного фреймбуфера с собственной шейдерной программой */
/*
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
      vertexArray: null, numOfVertices: 4, isElementDraw: false, isDepthTest: false, clearColor: null,
      resolutionLocation, timeLocation,
      onProgramInit: onInit,
      onProgramLoop: onLoop});
    return this.framebuffers[this.framebuffers.length-1];
  }
*/

  /** Добавление промежуточного фреймбуфера с собственной шейдерной программой */
  addFramebufferMRT(width: number, height: number, textureDescriptions: TextureDescription[], vsSource: string, fsSource: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}): Framebuffer {

    const program = this.createProgram(vsSource, fsSource);
    const [framebuffer, fbTextures] = this.createFramebufferMRT(width, height, textureDescriptions);
    this.gl.useProgram(program);
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    const frameLocation = this.gl.getUniformLocation(program, 'uFrame');
    this.framebuffers.push({
      width, height, program, framebuffer, fbTextures,
      vertexArray: null, numOfVertices: 4, isElementDraw: false, isDepthTest: false, clearColor: null,
      drawMode: this.gl.TRIANGLE_STRIP,
      resolutionLocation, timeLocation, frameLocation,
      onProgramInit: onInit,
      onProgramLoop: onLoop});
    return this.framebuffers[this.framebuffers.length-1];
  }

  /** Настройка финального рендербуфера */
  setRenderbuffer(vsSource: string, fsSource: string, 
    onInit: OnProgramInit = (p)=>{}, onLoop: OnProgramLoop = (t,dt)=>{}) {

    const program = this.createProgram(vsSource, fsSource);
    this.gl.useProgram(program);
    const resolutionLocation = this.gl.getUniformLocation(program, 'uResolution');
    const timeLocation = this.gl.getUniformLocation(program, 'uTime');
    const frameLocation = this.gl.getUniformLocation(program, 'uFrame');

    this.renderbufer = {program, vertexArray: null, numOfVertices: 4, 
      isElementDraw: false, isDepthTest: false,  clearColor: null,
      drawMode: this.gl.TRIANGLE_STRIP,
      resolutionLocation, timeLocation, frameLocation, onProgramInit: onInit, onProgramLoop: onLoop};
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
   * @param indices - массив с индексами вершин
   * @param pointSize - размер элемента вершинных координат, по умолчанию 2 (x, y)
   */
  setVertexArray(buffer: Renderbufer, name: string, vertices: number[], indices: number[], pointSize: number = 2) {
    const va = this.gl.createVertexArray();
    if(va === null) throw new Error('Ошибка при создании VertexArray')
    buffer.vertexArray = va;
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

  /**
   * Создание и инициализация массива вершин и нормалей для фреймбуфера
   * @param buffer - фреймбуфер
   * @param name - наименование атрибута массива вершин в шейдере
   * @param vertices - массив с координатами вершин
   * @param indices - массив с индексами вершин
   * @param pointSize - размер элемента вершинных координат, по умолчанию 2 (x, y)
   */
  setVertexNormalArray(buffer: Renderbufer, nameVertices: string, vertices: number[], nameNormals: string, normals: number[], indices: number[], pointSize: number = 2) {
    const va = this.gl.createVertexArray();
    if(va === null) throw new Error('Ошибка при создании VertexArray')
    buffer.vertexArray = va;
    buffer.numOfVertices = vertices.length/pointSize;
    this.gl.bindVertexArray(buffer.vertexArray);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    const attributeLocation = this.gl.getAttribLocation(buffer.program, nameVertices);
    this.gl.enableVertexAttribArray(attributeLocation);
    this.gl.vertexAttribPointer(attributeLocation, pointSize, this.gl.FLOAT, false, 0, 0);

    const normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
    const normalsAttributeLocation = this.gl.getAttribLocation(buffer.program, nameNormals);
    this.gl.enableVertexAttribArray(normalsAttributeLocation);
    this.gl.vertexAttribPointer(normalsAttributeLocation, 3, this.gl.FLOAT, false, 0, 0);

    if(indices === null) return;
    buffer.isElementDraw = true;
    buffer.numOfVertices = indices.length;
    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), this.gl.STATIC_DRAW);
  }
  
  /** 
   * Установка, привязка к программе и активация отрендеренной текстуры в общем массиве текстур.
   * Если текстура уже была добавлена в массив, то используется существующая.
   */
  setRenderedTexture(program: WebGLProgram, texture: WebGLTexture, name: string) {
    const textureLocation = this.gl.getUniformLocation(program, name);
    let ti = this.textures.findIndex(t=>t==texture);
    //this.gl.useProgram(program);
    if(ti === -1) {
      ti = this.textures.length;
      this.textures.push(texture);
    }
    this.gl.uniform1i(textureLocation, ti);
    this.gl.activeTexture(this.gl.TEXTURE0 + ti);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
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
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textures.push(texture);

    return texture;
  }

  /** Привязка текстуры без генерации данных MIPMAP */
  setTextureWithArray16F(program: WebGLProgram, uname: string, 
    width: number, height: number, array: Float32Array, options: {
      wrapS?: GLenum, wrapT?: GLenum, minFilter?: GLenum, magFilter?: GLenum
    }): WebGLTexture {
    const {
      wrapS = WebGL2RenderingContext.REPEAT,
      wrapT = WebGL2RenderingContext.REPEAT,
      minFilter = WebGL2RenderingContext.LINEAR,
      magFilter = WebGL2RenderingContext.LINEAR
    } = options;
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, wrapT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB16F, width, height, 0, this.gl.RGB, this.gl.FLOAT, array);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textures.push(texture);

    return texture;
  }


  /** Привязка текстуры без генерации данных MIPMAP */
  setTextureWithArray32Fx2(program: WebGLProgram, uname: string, 
    width: number, height: number, array: Float32Array, options: {
      wrapS?: GLenum, wrapT?: GLenum, minFilter?: GLenum, magFilter?: GLenum
    }): WebGLTexture {
    const {
      wrapS = WebGL2RenderingContext.REPEAT,
      wrapT = WebGL2RenderingContext.REPEAT,
      minFilter = WebGL2RenderingContext.LINEAR,
      magFilter = WebGL2RenderingContext.LINEAR
    } = options;
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, wrapT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RG32F, width, height, 0, this.gl.RG, this.gl.FLOAT, array);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textures.push(texture);

    return texture;
  }

  /** Привязка текстуры без генерации данных MIPMAP */
  setTextureWithArray32Fx3(program: WebGLProgram, uname: string, 
    width: number, height: number, array: Float32Array, options: {
      wrapS?: GLenum, wrapT?: GLenum, minFilter?: GLenum, magFilter?: GLenum
    }): WebGLTexture {
    const {
      wrapS = WebGL2RenderingContext.REPEAT,
      wrapT = WebGL2RenderingContext.REPEAT,
      minFilter = WebGL2RenderingContext.LINEAR,
      magFilter = WebGL2RenderingContext.LINEAR
    } = options;
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, wrapT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB32F, width, height, 0, this.gl.RGB, this.gl.FLOAT, array);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textures.push(texture);

    return texture;
  }

  /** Привязка текстуры без генерации данных MIPMAP */
  setTextureWithArray32Fx4(program: WebGLProgram, uname: string, 
    width: number, height: number, array: Float32Array, options: {
      wrapS?: GLenum, wrapT?: GLenum, minFilter?: GLenum, magFilter?: GLenum
    }): WebGLTexture {
    const {
      wrapS = WebGL2RenderingContext.REPEAT,
      wrapT = WebGL2RenderingContext.REPEAT,
      minFilter = WebGL2RenderingContext.LINEAR,
      magFilter = WebGL2RenderingContext.LINEAR
    } = options;
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
    this.gl.activeTexture(this.gl.TEXTURE0 + n);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_S, wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_WRAP_T, wrapT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, WebGL2RenderingContext.TEXTURE_MAG_FILTER, magFilter);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, array);
    
    const textureLocation = this.gl.getUniformLocation(program, uname);
    this.gl.uniform1i(textureLocation, n);
    this.textures.push(texture);

    return texture;
  }

  /** Привязка текстуры с генерацией данных MIPMAP */
  setTextureWithMIP(program: WebGLProgram, uname: string, img: TexImageSource): WebGLTexture {
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры')
    const n = this.textures.length;
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
    this.textures.push(texture);

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

    if(this.renderbufer === null) throw new Error('Не задан фреймбуфер для рендеринга на экран')
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
    this.frame++;

    this.onUpdate(time, timeDelta);

    // Шейдер A, рендеринг в текстуру
    this.framebuffers.forEach(e => {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, e.framebuffer);
      if(e.fbTextures.length > 1) {
        // Для множественных целевых текстур (MRT)
        this.gl.drawBuffers(e.fbTextures.map((_,i)=>this.gl.COLOR_ATTACHMENT0+i));
      }
      this.gl.useProgram(e.program);
      if(e.clearColor !== null) {
        this.gl.clearColor(e.clearColor.x, e.clearColor.y, e.clearColor.z, e.clearColor.w);

        if(e.isDepthTest) this.gl.enable(this.gl.DEPTH_TEST);
        else this.gl.disable(this.gl.DEPTH_TEST);
        //this.gl.enable(this.gl.CULL_FACE);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      }
      else {
        if(e.isDepthTest) {
          this.gl.enable(this.gl.DEPTH_TEST);
          this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
        }
        else this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.gl.bindVertexArray(e.vertexArray);
      this.gl.uniform2f(e.resolutionLocation, e.width, e.height);
      this.gl.uniform2f(e.timeLocation, time, timeDelta);
      this.gl.uniform1ui(e.frameLocation, this.frame);
      this.gl.viewport(0, 0, e.width, e.height);
      if(e.isElementDraw) this.gl.drawElements(e.drawMode, e.numOfVertices, this.gl.UNSIGNED_INT, 0);
      else this.gl.drawArrays(e.drawMode, 0, e.numOfVertices);

      // своп первичной и вторичной пинг-понг тексур и привязка
      e.fbTextures.forEach((t,i)=>{
        if(t.isPingPongOn) {
          this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0+i, WebGL2RenderingContext.TEXTURE_2D, t.primary, 0);
          [t.primary, t.secondary] = [t.secondary, t.primary];
        }
      });

      //console.log(e.numOfVertices);
      e.onProgramLoop(time, timeDelta);

      /*
      // привязка второй текстуры для пинг-понга
      e.fbTextures.forEach((t,i)=>{
        if(t.isPingPongOn) {
          this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0+i, WebGL2RenderingContext.TEXTURE_2D, t.secondary, 0);
        }
      });
*/
    });

    // Финальный рендер
    if(this.renderbufer === null) throw new Error('Не задан фреймбуфер для рендеринга на экран')
    this.resizeCanvasToDisplaySize();
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.useProgram(this.renderbufer.program);
    this.gl.bindVertexArray(this.renderbufer.vertexArray);
    this.gl.uniform2f(this.renderbufer.resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.renderbufer.timeLocation, time, timeDelta);
    this.gl.uniform1ui(this.renderbufer.frameLocation, this.frame);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if(this.renderbufer.isElementDraw) 
      this.gl.drawElements(this.renderbufer.drawMode, this.renderbufer.numOfVertices, this.gl.UNSIGNED_INT, 0);
    else this.gl.drawArrays(this.renderbufer.drawMode, 0, this.renderbufer.numOfVertices);
    this.renderbufer.onProgramLoop(time, timeDelta);

    /*
    // своп первичной и вторичной текстур для режима пинг-понг
    this.framebuffers.forEach(e => {
      e.fbTextures.forEach(t=>{
        if(t.isPingPongOn) {
          [t.primary, t.secondary] = [t.secondary, t.primary];
          //console.log(t);
        }
      });
    });
    */
    requestAnimationFrame(this.loop.bind(this));
  }
}