let startTime;
let currentTime;

export default async function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl2');

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const program = await initShaderProgram(gl, 'shaders/vs.glsl', 'shaders/fs.glsl');
  gl.useProgram(program);

  const vertices = [
    1.0,  1.0,
   -1.0,  1.0,
    1.0, -1.0,
   -1.0, -1.0,
  ];
  const vertexData = new Float32Array(vertices);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const vertexPosition = gl.getAttribLocation(program, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPosition);
  gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);

  // определение uniform переменных
  const resolutionUniform = gl.getUniformLocation(program, 'uResolution');
  const timeUniform = gl.getUniformLocation(program, 'uTime');

  startTime = currentTime = performance.now()/1000.;

  // локальная функция
  function draw() {
    const lCurrentTime = performance.now()/1000.;
    const time = lCurrentTime - startTime;
    const timeDelta = lCurrentTime - currentTime;
    currentTime = lCurrentTime;
  
    //console.log(performance.now()/1000.);
    // задание uniform переменных
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(timeUniform, time, timeDelta);
  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }
  
  draw();
}

async function loadShader(gl, type, url) {
  let response = await fetch(url);
  let source = await response.text();
  console.log(source);
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source.trim());
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("Ошибка компиляции шейдера: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);   
    return null;
  }
  return shader;  
}

async function initShaderProgram(gl, vsSourceUrl, fsSourceUrl) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSourceUrl);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSourceUrl);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, await vertexShader);
  gl.attachShader(shaderProgram, await fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

