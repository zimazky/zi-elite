#version 300 es

precision mediump float;

/** Разрешение экрана */
uniform vec2 uResolution;
/** 
 * Насколько камера попадает под солнце:
 * 1. - полностью на солнце, 0. - полностью в тени
 */
uniform float uCameraInShadow;
/** Синус половины углового размера солнца */
uniform float uSunDiscAngleSin;
/** Направление на солнце */
uniform vec3 uSunDirection;
/** Цвет и интенсивность света от солнца */
uniform vec3 uSunDiscColor;
/** Цвет и интенсивность света неба */
uniform vec3 uSkyColor;

/** Положение камеры */
uniform vec3 uCameraPosition;

/** Цвет и интенсивность света фар: vec3(0.) - выключен */
uniform vec3 uHeadLight;

/** Положение сигнальных ракет */
uniform vec3 uFlarePositions[2];
/** Цвет и интенсивность света сигнальных ракет */
uniform vec3 uFlareLights[2];

/** Текстура программы A */
uniform sampler2D uDepthProgramA;
/** Нормали и глубина */
uniform sampler2D uNormalDepthProgramB;
/** Значения альбедо */
uniform sampler2D uAlbedoProgramB;

uniform vec2 uTextureBResolution;
uniform sampler2D uTextureBlueNoise;

/** Луч в системе координат планеты */
in vec3 vRay;
in vec3 vRaySky;

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "common/constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета атмосферного рассеивания
// ----------------------------------------------------------------------------
#ifndef ATM_MODULE
#include "render/atmosphere.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функции отображения ночного неба
// ----------------------------------------------------------------------------
#ifndef SKY_MODULE
#include "render/sky.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций постобработки
// ----------------------------------------------------------------------------
#ifndef POSTPROC_MODULE
#include "render/postprocess.glsl"
#endif


void main() {

  float k = uResolution.x/uResolution.y > uTextureBResolution.x/uTextureBResolution.y
    ? uTextureBResolution.x/uResolution.x
    : uTextureBResolution.y/uResolution.y;
  vec2 uv = vec2(0.5)+k/uTextureBResolution*(gl_FragCoord.xy-0.5*uResolution);

  #ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  float depthA = texture(uDepthProgramA, uv);
  #endif

  vec3 albedoB = texture(uAlbedoProgramB, uv);
  vec4 normalDepthB = texture(uNormalDepthProgramB, uv);

  #ifdef DEPTH_ERROR_VIEW
  float derr = normalDepthB.w-depthA;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(derr/100.);
  col = pow(col, vec3(1./2.2));

  #else
  vec3 col = bufB.rgb;
  float t = bufB.w;
  vec3 rd = normalize(vRay);
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd, uSunDirection),0.,1.);

  if(t > MAX_TERRAIN_DISTANCE) {
    // небо из текстуры
    col = 0.5*nightSky(normalize(vRaySky));
    // диск солнца
    float sunsin = sqrt(1.-sundot*sundot);
    col += sunsin < uSunDiscAngleSin ? vec3(1.,0.8,0.6) : vec3(0);
    // горизонт планеты
    col *= planetIntersection(uCameraPosition, rd);
    // атмосферное рассеивание
    ResultScattering rs;
    rs = scattering(uCameraPosition, rd, uSunDirection);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }
  else {
    ResultScattering rs = scatteringWithIntersection(uCameraPosition, rd, uSunDirection, t);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }
  // засвечивание солнцем
  col += 0.2*uCameraInShadow*normalize(uSunDiscColor)*pow(sundot, 8.0);

  col =  col*mat2sRGB; // Преобразование в sRGB
  col = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);

#endif

  fragColor = vec4(col, 1.);
}
 