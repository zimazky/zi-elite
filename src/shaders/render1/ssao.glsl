#define SSAO_MODULE

#define SSAO_KERNEL_SIZE 32
#define SSAO_BIAS 0.

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// в экранном пространстве (Screen-Space Ambient Occlusion)
// ----------------------------------------------------------------------------

uniform mediump float uCameraViewAngle;
uniform vec3 uSSAOSamples[SSAO_KERNEL_SIZE];

in float vFocus;

/**
 * Функция определения затенения окружающего освещения для случая перспективной проекции
 *   pos - положение фрагмента в видовых координатах (координаты xy 0,0 соответствуют центру экрана, z - напрвлена за экран )
 *   normal - нормаль фрагмента в глобальных координатах
 *   rand - случайный вектор в глобальных координатах
 */
float calcSSAO(vec3 pos, vec3 normal, vec3 rand, sampler2D depthTexture, float radius) {

  vec3 tangent = normalize(rand - normal * dot(rand, normal));
  vec3 bitangent = cross(normal, tangent);
  // матрица преобразования в видовую систему координат
  mat3 TBN = mat3(tangent, bitangent, normal);

  vec2 k = vec2(1, vAspectB);

  // проверка на размер спроецированной полусферы выборки
  // строго должен быть больше пикселя для включения алгоритма
  // эксперименты показали, что алгоритм заметен при maxScreenRadius>10
  float maxScreenRadius = vFocus/(vFocus+pos.z)*radius*uTextureBResolution.x;
  if(maxScreenRadius <= 10.) return 1.;

  float occlusion = 0.;
  for(int i=0; i<SSAO_KERNEL_SIZE; i++) {
    vec3 s = TBN * uSSAOSamples[i];
    s = pos + radius * s;

    vec2 t = vFocus/(vFocus+s.z)*k;
    vec2 ts = t*s.xy;
    vec2 offset = vec2(0.5)+0.5*ts;

    float sampleDepth = s.z*texture(depthTexture, offset).x/length(s);
    if(abs(ts.x)>1. || abs(ts.y)>1.) {
      sampleDepth = MAX_TERRAIN_DISTANCE;
    }
    
    float rangeCheck = smoothstep(0., 1., radius/abs(pos.z - sampleDepth));
    occlusion += (sampleDepth >= (s.z + SSAO_BIAS) ? 0. : 1.) * rangeCheck;    
  }

  return 1. - occlusion/float(SSAO_KERNEL_SIZE);
}


/**
 * Функция определения затенения окружающего освещения для случая орто-проекции
 *   pos - положение фрагмента в видовых координатах (координаты xy 0,0 соответствуют центру экрана, z - напрвлена за экран )
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

    float sampleDepth = texture(depthTexture, offset).x;
    if(abs(ts.x)>1. || abs(ts.y)>1.) {
      sampleDepth = MAX_TRN_ELEVATION;
    }
    
    float rangeCheck = 1.;//smoothstep(0., 1., SSAO_RADIUS/abs(pos.z - sampleDepth));
    occlusion += (sampleDepth >= (s.z + SSAO_BIAS) ? 0. : 1.) * rangeCheck;    
  }

  //return bitangent;
  return 1. - occlusion/float(SSAO_KERNEL_SIZE);

}
