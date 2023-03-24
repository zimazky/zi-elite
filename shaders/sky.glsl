#define SKY_MODULE

// ----------------------------------------------------------------------------
// Модуль определения функции отображения ночного неба
// ----------------------------------------------------------------------------

uniform sampler2D uTextureMilkyway;
uniform sampler2D uTextureConstellation;

// яркость разметки созвездий на небе
uniform float uConstellationsColor;

vec3 nightSky(vec3 rd) {
  vec2 ts = vec2(0.5*atan(rd.x,rd.z), 0.5*PI+atan(rd.y,length(rd.xz)));
  vec3 col = eotf(texture(uTextureMilkyway, ts/PI).rgb + uConstellationsColor*texture(uTextureConstellation, ts/PI).rgb);
  return col;
}
