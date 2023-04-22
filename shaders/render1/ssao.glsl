#define SSAO_MODULE

#define SSAO_KERNEL_SIZE 32
#define SSAO_BIAS 0.

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// в экранном пространстве (Screen-Space Ambient Occlusion)
// ----------------------------------------------------------------------------

uniform mediump float uCameraViewAngle;
uniform vec3 uSSAOSamples[SSAO_KERNEL_SIZE];

/**
 * Функция определения затенения окружающего освещения
 *   pos - положение фрагмента в видовых координатах
 *   normal - нормаль фрагмента в глобальных координатах
 *   rand - случайный вектор в глобальных координатах
 */
float calcSSAO(vec3 pos, vec3 normal, vec3 rand, sampler2D depthTexture, float SSAO_RADIUS) {

  vec3 tangent = normalize(rand - normal * dot(rand, normal));
  vec3 bitangent = cross(normal, tangent);
  // матрица преобразования в видовую систему координат
  mat3 TBN = mat3(tangent, bitangent, normal);
  // фокусное расстояние проекции
  float f = 1./tan(0.5*uCameraViewAngle);
  float aspect = uResolution.x/uResolution.y;
  float aspectB = uTextureBResolution.x/uTextureBResolution.y;

  vec2 k = aspect > aspectB ? vec2(1, aspectB) : vec2(aspect/aspectB, aspect);

  float occlusion = 0.;
  for(int i=0; i<SSAO_KERNEL_SIZE; i++) {
    vec3 s = TBN * uSSAOSamples[i];
    s = pos + SSAO_RADIUS * s;

/*
    vec4 offset = vec4(sample, 1.);
    offset = projection * offset; // переход из видовой в экранную систему координат
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5; // преобразование к интервалу [0., 1.]
*/
    vec2 t = f/(f+s.z)*k;
    vec2 ts = t*s.xy;
    vec2 offset = vec2(0.5)+0.5*ts;

    float sampleDepth = s.z*texture(depthTexture, offset).w/length(s);
    if(abs(ts.x)>1. || abs(ts.y)>1.) {
      //vec2 sts = min(sign(ts),ts); 
      //sampleDepth += (normal.x*(sts.x/t.x-s.x)+normal.y*(sts.y/t.y-s.y))/normal.z;
      sampleDepth = MAX_TERRAIN_DISTANCE;
    }
    
    //occlusion += sampleDepth >= sample.z + SSAOBias ? 1. : 0.;

    float rangeCheck = smoothstep(0., 1., SSAO_RADIUS/abs(pos.z - sampleDepth));
    occlusion += (sampleDepth >= (s.z + SSAO_BIAS) ? 0. : 1.) * rangeCheck;    
  }

  return 1. - occlusion/float(SSAO_KERNEL_SIZE);

}


/**
 * Функция определения затенения окружающего освещения
 *   pos - положение фрагмента в видовых координатах
 *   normal - нормаль фрагмента в глобальных координатах
 *   rand - случайный вектор в глобальных координатах
 */
float calcSSAOOrtho(vec3 pos, vec3 normal, vec3 rand, sampler2D depthTexture, vec2 scale, float SSAO_RADIUS) {

  vec3 tangent = normalize(rand - normal * dot(rand, normal));
  vec3 bitangent = cross(normal, tangent);
  // матрица преобразования в видовую систему координат
  mat3 TBN = mat3(tangent, bitangent, normal);

  float occlusion = 0.;
  for(int i=0; i<SSAO_KERNEL_SIZE; i++) {
    vec3 s = TBN * uSSAOSamples[i];
    s = pos + SSAO_RADIUS * s;

    vec2 ts = scale*s.xy;
    vec2 offset = vec2(0.5)+0.5*ts;

    float sampleDepth = texture(depthTexture, offset).w;
    if(abs(ts.x)>1. || abs(ts.y)>1.) {
      sampleDepth = MAX_TRN_ELEVATION;
    }
    
    float rangeCheck = 1.;//smoothstep(0., 1., SSAO_RADIUS/abs(pos.z - sampleDepth));
    occlusion += (sampleDepth >= (s.z + SSAO_BIAS) ? 0. : 1.) * rangeCheck;    
  }

  return 1. - occlusion/float(SSAO_KERNEL_SIZE);

}
