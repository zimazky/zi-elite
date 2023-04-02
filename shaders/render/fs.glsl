#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;

// параметры времени
// x - время с момента запуска программы в секундах, 
// y - время с момента отображения предыдущего кадра
uniform vec2 uTime;

// текстуры
uniform sampler2D uTextureProgramA;

out vec4 fragColor;


void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;

  vec3 col = texture(uTextureProgramA, uv).rgb;
  //vec3 col = vec3(uv.x,uv.y,0.);
  //col = pow(col, vec3(1./2.2));

  fragColor = vec4(col, 1.);
  /*
  col.rgb =  col.rgb*mat2sRGB; // Преобразование в sRGB
  //col.rgb = TonemapACES(col.rgb);
  // Квантование и дитеринг с гамма-коррекцией
  vec3 color = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);
  //vec3 color = oetf(col.rgb);
  fragColor = vec4( color, 1. );
  //col.rgb += noise(uv*uTime.x) / 127.; // dither
  //col.rgb = pow(col.rgb, vec3(1./2.2)); // gamma
  //fragColor = vec4( col.rgb, 1. );
  */
}
 