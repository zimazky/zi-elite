import { GLContext } from "./glcontext";


interface OnProgramInit {
  (program: WebGLProgram): void;
}

interface OnProgramLoop {
  (time: number, timeDelta: number): void;
}

export class Engine extends GLContext {
  startTime: number;
  currentTime: number;
  resolutionUniform: WebGLUniformLocation;
  timeUniform: WebGLUniformLocation;
  onProgramInit: OnProgramInit = (program) => {};
  onProgramLoop: OnProgramLoop = (t, dt) => {};

  public constructor(elementId?: string) {
    super(elementId);
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    //console.log(source);
    return source;
  }

  public async start() {
    const vsSource = this.loadShader('shaders/vs.glsl');
    const fsSource = this.loadShader('shaders/fs.glsl');
    const program = this.createProgram(await vsSource, await fsSource);
    this.gl.useProgram(program);
    this.createBuffer();
    const vertexPosition = this.gl.getAttribLocation(program, "aVertexPosition");
    this.gl.enableVertexAttribArray(vertexPosition);
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);

    // определение uniform переменных
    this.resolutionUniform = this.gl.getUniformLocation(program, 'uResolution');
    this.timeUniform = this.gl.getUniformLocation(program, 'uTime');
    // определение кастомных uniform переменных
    this.onProgramInit(program);

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
    //this.gl.bindBuffer(this.gl.ARRAY_BUFFER, undefined);
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

  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
    return this.gl.getUniformLocation(program, name);
  }

  setTexture(program: WebGLProgram, uname: string, img: TexImageSource, num: number): WebGLTexture {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    // задаём параметры, чтобы можно было отрисовать изображение любого размера
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
//    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST_MIPMAP_NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);//_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    
    // Для сферической проекции нужно отключать МипМап карты, иначе виден шов при переходе координат от 1. к 0.
    //this.gl.generateMipmap(this.gl.TEXTURE_2D);

    const textureLocation = this.gl.getUniformLocation(program, uname);
    // Tell the shader to use texture unit 0 for u_texture
    this.gl.uniform1i(textureLocation, num);
    
    return texture;
  }

  private loop(): void {
    //this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.resizeCanvasToDisplaySize();

    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - this.startTime;
    const timeDelta = lCurrentTime - this.currentTime;
    this.currentTime = lCurrentTime;
  
    // задание uniform переменных
    this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.timeUniform, time, timeDelta);
    // задание кастомных uniform переменных
    this.onProgramLoop(time, timeDelta);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.loop.bind(this));
  }
}