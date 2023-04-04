#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;
uniform vec2 uTextureBResolution;

// параметры времени
// x - время с момента запуска программы в секундах, 
// y - время с момента отображения предыдущего кадра
uniform vec2 uTime;

// текстуры
uniform sampler2D uTextureProgramB;

in vec3 vTextureBColor;

out vec4 fragColor;


void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  //vec3 col = vec3(uv.x,uv.y,0);//sin(uTime.x));
  vec3 col = vTextureBColor;
  //vec3 col = vec3(LvsR);
  fragColor = vec4(col, 1.);
}
 