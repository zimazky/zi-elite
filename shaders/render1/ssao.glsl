#define SSAO_MODULE

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// в экранном пространстве (Screen-Space Ambient Occlusion)
// ----------------------------------------------------------------------------
uniform int uSSAOKernelSize;
uniform float uSSAORadius;

uniform sampler2D uTextureSSAONoise;

uniform vec3 samples[64];

const float SSAOBias = 0.;

/**
 * Функция определения затенения окружающего освещения
 *   pos - положение фрагмента в видовых координатах
 *   normal - нормаль фрагмента в глобальных координатах
 *   rand - случайный вектор в глобальных координатах
 */
float calcSSAO(vec3 pos, vec3 normal, vec3 rand, sampler2D depthTexture) {
  vec3 tangent = normalize(rand - normal * dot(rand, normal));
  vec3 bitangent = cross(normal, tangent);
  // матрица преобразования в видовую систему координат
  mat3 TBN = mat3(tangent, bitangent, normal);

  float occlusion = 0.;
  for(int i=0; i<uSSAOKernelSize; i++) {
    vec3 sample = TBN * samples[i];
    sample = pos + uSSAORadius * sample;

    vec4 offset = vec4(sample, 1.0);
    offset = projection * offset; // переход из видовой в экранную систему координат
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5; // преобразование к интервалу [0., 1.]

    float sampleDepth = texture(depthTexture, offset.xy).w;

    //occlusion += sampleDepth >= sample.z + SSAOBias ? 1. : 0.;

    float rangeCheck = smoothstep(0.0, 1.0, radius / abs(pos.z - sampleDepth));
    occlusion += (sampleDepth >= sample.z + bias ? 1. : 0.) * rangeCheck;    
  }

  return 1. - occlusion/uSSAOKernelSize;

}
