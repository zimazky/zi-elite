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
uniform sampler2D uTextureProgramA;
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


void main() {

  float k = uResolution.x/uResolution.y > uTextureBResolution.x/uTextureBResolution.y
    ? uTextureBResolution.x/uResolution.x
    : uTextureBResolution.y/uResolution.y;
  vec2 uv = vec2(0.5)+k/uTextureBResolution*(gl_FragCoord.xy-0.5*uResolution);

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
  //col = pow(col, vec3(1./2.2));

  #endif

  fragColor = vec4(col, 1.);
}
 