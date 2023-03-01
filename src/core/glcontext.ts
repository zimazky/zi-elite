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
    this.gl = this.canvas.getContext('webgl2');
    if (!this.gl) throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.');
  }

  createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source.trim());
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert("Error compiling shader: " + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);   
      return null;
    }
    return shader;  
  }
  
  createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);
    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
      return null;
    }
    return shaderProgram;
  }

}