#version 300 es

precision mediump float;

/** Разрешение экрана */
uniform vec2 uResolution;
uniform highp mat3 uTransformMat;


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
uniform sampler2D uTextureProgramA;
/** Нормали и глубина */
uniform sampler2D uNormalDepthProgramB;
/** Значения альбедо */
uniform sampler2D uAlbedoProgramB;

uniform vec2 uTextureBResolution;
uniform sampler2D uTextureBlueNoise;

uniform sampler2D uTextureSSAONoise;

/** Луч в системе координат планеты */
in vec3 vRay;
in vec3 vRaySky;
in vec3 vRayScreen;

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "common/constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// ----------------------------------------------------------------------------
#ifndef SSAO_MODULE
#include "render1/ssao.glsl"
#endif


void main() {
  float aspect = uResolution.x/uResolution.y;
  float aspectB = uTextureBResolution.x/uTextureBResolution.y;
  vec2 k = aspect > aspectB
    ? vec2(1, aspectB/aspect)// /uResolution.x // (1., 1./aspect)
    : vec2(aspect/aspectB, 1);// /uResolution.y; // (aspect, 1.)
  vec2 uv = vec2(0.5)+k*(gl_FragCoord.xy/uResolution-0.5);

  #ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  float depthA = texture(uTextureProgramA, uv).w;
  #endif

  vec4 albedoB = texture(uAlbedoProgramB, uv);
  vec4 normalDepthB = texture(uNormalDepthProgramB, uv);

  #ifdef DEPTH_ERROR_VIEW
  float derr = normalDepthB.w-depthA;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(derr/100.);
  col = pow(col, vec3(1./2.2));

  #else
  vec3 col = albedoB.rgb;
  float t = normalDepthB.w;
  vec3 rd = normalize(vRay);
  
  vec2 noiseScale = uResolution/4.;
  vec2 uv2 = gl_FragCoord.xy/4.;
  vec3 rand = texture(uTextureSSAONoise, uv2).xyz;

  vec3 posScreen = normalize(vRayScreen)*t;
  posScreen.z = -posScreen.z;
  float ssao = calcSSAO(posScreen, inverse(uTransformMat)*normalDepthB.xyz, rand, uNormalDepthProgramB);
  //col = (uSSAOSamples[int(mod(0.1*gl_FragCoord.x,64.))]);
  //col = vec3(ssao);
  //col = posScreen/1000.;
  //col = vec3(1);
  col *= pow(ssao,1.5);
  col *= clamp(0.5+0.5*normalDepthB.y, 0., 1.);

  //col = posScreen/1000.;
  col = pow(col, vec3(1./2.2));

  #endif

  fragColor = vec4(col, 1.);
}
 