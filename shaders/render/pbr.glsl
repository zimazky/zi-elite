#define PBR_MODULE

// ----------------------------------------------------------------------------
// Physically-Based Rendering модуль
// ----------------------------------------------------------------------------

vec3 lambert(vec3 omega, float mu, float mu_0) {
	return omega;
}

vec3  lommel_seeliger(vec3 omega, float mu, float mu_0) {
 	return omega / max( 0.01, mu + mu_0 );
}

/** 
 * Функция неламбертового диффузного рассеивания.
 * Среднее законов Lambert и Lommel-Seeliger
 *   omega - альбедо
 *   omega_0 - альбедо одиночного рассеивания
 *   mu - косинус угла между нормалью и направлением на камеру
 *   mu0 - косинус угла между нормалью и направлением на источник света
 */
vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
	vec3 omega_0 = 244. * omega/(184.*omega + 61.);
	return omega_0 * ( 0.5*omega*(1.+sqrt(mu*mu_0)) + .25/max(0.4, mu+mu_0) );
}

/** 
 * Расчет коэффициента Френеля согласно аппроксимации Френеля-Шлика
 * Описывает коэффициент поверхностного отражения при разных углах
 * F0 - степень отражения поверхности при нулевом угле
 * cosTheta - косинус угла между зенитом и лучом падения света
 */
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1. - F0) * pow(1. - cosTheta, 5.);
}   

/**
 * Функция нормального распределения D модели BRDF Cook-Torrance
 * (normal Distribution function, NDF)
 * Модель Trowbridge-Reitz GGX
 * Аппроксимирует количество микрограней поверхности, ориентированных по медианному вектору,
 * основываясь на шероховатости поверхности
 * N - нормаль к поверхности
 * H - медианный вектор, лежащий посередине между направлением падающего света L и направлением наблюдателя V
 * roughness - шероховатость поверхности
 */
float DistributionGGX(vec3 N, vec3 H, float roughness)
{
  float a = roughness*roughness;
  float a2 = a*a;
  float NdotH = max(dot(N, H), 0.);
  float NdotH2 = NdotH*NdotH;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  return a2 / denom;
}

/** 
 * Функция геометрии G модели Cook-Torrance
 * NdotV - косинус угла между нормалью и направлением на камеру
 * roughness - шероховатость поверхности
 */
float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = roughness + 1.;
  float k = (r*r) / 8.;
  float denom = NdotV * (1. - k) + k;
  return NdotV / denom;
}

/** 
 * Функция геометрии G модели BRDF Cook-Torrance
 * Модель Smith's Schlick-GGX
 * Описывает свойство самозатенения микрограней. 
 * Когда поверхность довольно шероховатая, одни микрограни поверхности могут перекрывать другие, 
 * тем самым уменьшая количество света, отражаемого поверхностью.
 * N - вектор нормали
 * V - луч от камеры
 * L - луч от источника света
 * roughness - шероховатость поверхности
 */
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.);
  float NdotL = max(dot(N, L), 0.);
  float ggx2  = GeometrySchlickGGX(NdotV, roughness);
  float ggx1  = GeometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}


vec4 render(vec3 ro, vec3 rd, float t0)
{
  vec3 light1 = uSunDirection;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col = vec3(0);
  int raycastIterations = 0;
  int shadowIterations = 0;
  float t = t0>MAX_TERRAIN_DISTANCE ? 2.*MAX_TERRAIN_DISTANCE : raycast(ro, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
  if(t>MAX_TERRAIN_DISTANCE) {
    t = 2. * MAX_TERRAIN_DISTANCE;

  #ifdef RAYCAST_ITERATIONS_VIEW
    t = 0.;
  #endif
  
  }
  else {
    // mountains		
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormalH(pos, max(200.,t));
    vec3 hal = normalize(light1-rd);
        
    // цвет
    vec3 kd = terrain_color(pos, nor).rgb;

    // lighting		
    
    // ambient
    float amb = clamp(0.5+0.5*nor.y, 0., 1.);
	  float LdotN = dot(light1, nor);
    float RdotN = clamp(-dot(rd, nor), 0., 1.);

    // 1-ая световая ракета
    vec3 fd1 = uFlare1Position-pos;
    float fdist1sqr = dot(fd1,fd1);
    fd1 /= sqrt(fdist1sqr);
    float F1dotN = clamp(dot(fd1, nor), 0., 1.);
    // 2-ая световая ракета
    vec3 fd2 = uFlare2Position-pos;
    float fdist2sqr = dot(fd2,fd2);
    fd2 /= sqrt(fdist2sqr);
    float F2dotN = clamp(dot(fd2, nor), 0., 1.);

    float xmin = 6.*uSunDiscAngleSin; // синус половины углового размера солнца (здесь увеличен в 6 раз для мягкости), задает границу плавного перехода
    float shd = softPlanetShadow(pos, light1);
    if(LdotN>-xmin && shd>0.001) shd *= softShadow(pos, light1, t, shadowIterations);
    float dx = clamp(0.5*(xmin-LdotN)/xmin, 0., 1.);
    LdotN = clamp(xmin*dx*dx + LdotN, 0., 1.);

	  //vec3 lamb = 2.*AMBIENT_LIGHT*amb*lambert(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lambert(kd, RdotN, LdotN);
	  //vec3 lomm = 2.*AMBIENT_LIGHT*amb*lommel_seeliger(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lommel_seeliger(kd, RdotN, LdotN);
	  vec3 lunar = uSkyColor*amb*lunar_lambert(kd, RdotN, amb)     // свет от неба
      + uSunDiscColor*LdotN*shd*lunar_lambert(kd, RdotN, LdotN)  // свет солнца
      + uHeadLight*RdotN*lunar_lambert(kd, RdotN, RdotN)/(t*t)   // свет фар
      + uFlare1Light*F1dotN*lunar_lambert(kd, RdotN, F1dotN)/(fdist1sqr)  // свет 1-ой сигнальной ракеты
      + uFlare2Light*F2dotN*lunar_lambert(kd, RdotN, F2dotN)/(fdist2sqr);  // свет 2-ой сигнальной ракеты
    col = lunar;//mix(lomm, lunar, LvsR);
    
    //////////////////
	  // fog
    //float fo = 1.0-exp(-pow(0.00009*t,1.5) );
    //col = mix(col, FOG_COLOR, fo );
	}

  // 1-ая световая ракета
  vec3 fd = uFlare1Position - ro;
  float fdist2 = dot(fd, fd);
  float fdist = sqrt(fdist2);
  fd /= fdist;
  float f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare1Light;
    t = fdist;
  }
  // 2-ая световая ракета
  fd = uFlare2Position - ro;
  fdist2 = dot(fd, fd);
  fdist = sqrt(fdist2);
  fd /= fdist;
  f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare2Light;
    t = fdist;
  }
}
