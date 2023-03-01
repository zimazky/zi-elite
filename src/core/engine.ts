import { GLContext } from "./glcontext";

export class Engine extends GLContext {
  startTime: number;
  currentTime: number;
  resolutionUniform: WebGLUniformLocation;
  timeUniform: WebGLUniformLocation;

  public constructor(elementId?: string) {
    super(elementId);
  }

  public async loadShader(sourceUrl: string): Promise<string> {
    let response = await fetch(sourceUrl);
    let source = await response.text();
    console.log(source);
    return source;
  }

  public async start() {
    const vsSource = this.loadShader('shaders/vs.glsl');
    const fsSource = this.loadShader('shaders/fs.glsl');
    const program = this.createProgram(await vsSource, await fsSource);
    this.gl.useProgram(program);
    this.createBuffer(program);

    // определение uniform переменных
    this.resolutionUniform = this.gl.getUniformLocation(program, 'uResolution');
    this.timeUniform = this.gl.getUniformLocation(program, 'uTime');

    this.startTime = this.currentTime = performance.now()/1000.;

    this.loop();
  }

  createBuffer(program: WebGLProgram) {
    const vertices = [
      1.0,  1.0,
     -1.0,  1.0,
      1.0, -1.0,
     -1.0, -1.0,
    ];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    //this.gl.bindBuffer(this.gl.ARRAY_BUFFER, undefined);
    const vertexPosition = this.gl.getAttribLocation(program, "aVertexPosition");
    this.gl.enableVertexAttribArray(vertexPosition);
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
  }

  resize(): void {
    if(this.canvas === undefined) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  
  private loop(): void {
    //this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.resize();

    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - this.startTime;
    const timeDelta = lCurrentTime - this.currentTime;
    this.currentTime = lCurrentTime;
  
    // задание uniform переменных
    this.gl.uniform2f(this.resolutionUniform, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.timeUniform, time, timeDelta);


    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.loop.bind(this));
  }
}