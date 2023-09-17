type TextureDescription = {
  format: 'RGBA'|'RGBA16F'|'RGBA32F'
}

export class GLContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;

  constructor(elementId?: string) {
    if(elementId !== undefined) {
      this.canvas = document.getElementById(elementId) as HTMLCanvasElement;
      if(this.canvas === undefined) throw new Error('Cannot find element named: '+elementId);
    }
    else {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }
    const gl = this.canvas.getContext('webgl2');
    if (!gl) throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.');
    this.gl = gl;
    if (!this.gl) throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.');
    this.gl.getExtension('EXT_color_buffer_float');
  }

  createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if(shader === null) throw new Error('Ошибка при создании шейдера');
    this.gl.shaderSource(shader, source.trim());
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert('Ошмбка компиляции шейдера: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);   
      throw new Error('Ошмбка компиляции шейдера: ' + this.gl.getShaderInfoLog(shader));
    }
    return shader;  
  }
  
  createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = this.gl.createProgram();
    if(shaderProgram === null) throw new Error('Ошибка при создании шейдерной программы');
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);
    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
    }
    return shaderProgram;
  }

  /** Функция создания фреймбуффера с одной целевой текстурой */
  createFramebuffer0(width: number, height: number): [WebGLFramebuffer, WebGLTexture] {
    // Создаем и привязываем framebuffer
    const framebuffer = this.gl.createFramebuffer();
    if(framebuffer === null) throw new Error('Ошибка при создании фреймбуфера');
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    // Создание текстуры
    const texture = this.gl.createTexture();
    if(texture === null) throw new Error('Ошибка при создании текстуры');
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    // Определение формата текстуры
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    // Создаем и привязываем буфер глубины
    const depthBuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthBuffer);

    const e = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (e !== this.gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer object is incomplete: ' + e.toString());
    return [framebuffer, texture];
  }

  /**
   * Функция создания фреймбуффера с множественными целевыми текстурами 
   * @param width - ширина в пикселях
   * @param height - высота в пикселях
   * @param num - число текстур (multiple render targets)
   * @returns [фреймбуфер, массив созданных текстур]
   */
  createFramebufferMRT(width: number, height: number, num: number): [WebGLFramebuffer, WebGLTexture[]] {
    // Создаем и привязываем framebuffer
    const framebuffer = this.gl.createFramebuffer();
    if(framebuffer === null) throw new Error('Ошибка при создании фреймбуфера');
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    // Создание текстур
    const textures: WebGLTexture[] = [];
    for(let i=0; i<num; i++) {
      const texture = this.gl.createTexture();
      if(texture === null) throw new Error('Ошибка при создании текстуры');
      textures.push(texture);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      // Определение формата текстуры
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameterf(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0+i, this.gl.TEXTURE_2D, texture, 0);
    }
    // Создаем и привязываем буфер глубины
    const depthBuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthBuffer);

    const e = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (e !== this.gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer object is incomplete: ' + e.toString());
    return [framebuffer, textures]
  }

}