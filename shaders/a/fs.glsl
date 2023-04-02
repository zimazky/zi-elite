#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;

// параметры времени
// x - время с момента запуска программы в секундах, 
// y - время с момента отображения предыдущего кадра
uniform vec2 uTime;

out vec4 fragColor;


void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  vec3 col = vec3(uv.x,uv.y,sin(uTime.x));

  //vec3 col = vec3(LvsR);
  fragColor = vec4(col, 1.);
}
 