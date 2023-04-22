#define TERR_MODULE

// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
uniform sampler2D uTextureGrayNoise;

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    vec2 u = f*f*(3.0-2.0*f);
    vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;

  return vec3((a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y),
               du*(u.yx*(a-b-c+d) + vec2(b,c) - a));
}

const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);
const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота
const float GRASS_HEIGHT_MAX = 600.;
const float SEA_LEVEL = 0.;

// Генерация высоты с эррозией без производных упрощенная
float terrainH(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<16; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
float terrainM(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<9; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
float terrainS(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<5; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}

vec3 calcNormalH(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainH(pos.xz-eps.xy) - terrainH(pos.xz+eps.xy),
    2.0*eps.x,
    terrainH(pos.xz-eps.yx) - terrainH(pos.xz+eps.yx)
  ));
}

vec3 calcNormalM(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainM(pos.xz-eps.xy) - terrainM(pos.xz+eps.xy),
    2.0*eps.x,
    terrainM(pos.xz-eps.yx) - terrainM(pos.xz+eps.yx)
  ));
}

// функция определения затененности
float softShadow(vec3 ro, vec3 rd, float dis, out int i) {
  float minStep = clamp(0.01*dis,10.,500.);
  float cosA = sqrt(1.-rd.z*rd.z); // косинус угла наклона луча от камеры к горизонтали

  float res = 1.;
  float t = 0.01*dis;
  for(i=0; i<200; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + t*rd;
    if(p.y>MAX_TRN_ELEVATION) return smoothstep(-uSunDiscAngleSin,uSunDiscAngleSin,res);
    float h = p.y - terrainS(p.xz);
	  res = min(res, cosA*h/t);
    if(res<-uSunDiscAngleSin) return smoothstep(-uSunDiscAngleSin,uSunDiscAngleSin,res);
    t += max(minStep, abs(0.7*h)); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return 0.;
}

const mat2 m2 = mat2(0.8,-0.6,0.6,0.8);
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000*texture(uTextureGrayNoise, p/256.0 ).x; p = m2*p*2.02;
  f += 0.2500*texture(uTextureGrayNoise, p/256.0 ).x; p = m2*p*2.03;
  f += 0.1250*texture(uTextureGrayNoise, p/256.0 ).x; p = m2*p*2.01;
  f += 0.0625*texture(uTextureGrayNoise, p/256.0 ).x;
  return f/0.9375;
}

// ----------------------------------------------------------------------------
// Материалы
// ----------------------------------------------------------------------------

// rgb - альбедо, a - зарезервировано
vec4 grassAlbedo = 5.*vec4(0.042, 0.042, 0.015, 1.);
//vec4 grassAlbedo = vec4(0.27, 0.21, 0.09, 1.);
vec4 darkRockAlbedo = 5.*vec4(0.072, 0.045, 0.027, 1.);
vec4 lightRockAlbedo = 5.*vec4(0.09, 0.081, 0.072, 1.);
vec4 sandAlbedo = 5.*1.7*vec4(0.09, 0.081, 0.072, 1.);
vec4 darkSandAlbedo = 5.*vec4(0.030, 0.022, 0.010, 1.);
//vec4 snowAlbedo = 5.*vec4(0.1798, 0.1885, 0.203, 1.);

//vec4 grassAlbedo = vec4(0.158, 0.158, 0.053, 1.);
//vec4 grassAlbedo = vec4(0.27, 0.21, 0.09, 1.);
//vec4 darkRockAlbedo = vec4(0.252, 0.158, 0.095, 1.);
//vec4 lightRockAlbedo = vec4(0.315, 0.284, 0.252, 1.);
//vec4 sandAlbedo = vec4(0.252, 0.158, 0.095, 1.);
//vec4 sandAlbedo = vec4(0.585, 0.482, 0.428, 1.);
//vec4 darkSandAlbedo = vec4(0.150, 0.110, 0.050, 1.);
//vec4 snowAlbedo = vec4(0.750, 0.940, 1.00, 1.);
vec4 snowAlbedo = vec4(0.75, 0.80, 0.95, 1.);

// определение цвета пикселя
vec4 terrain_color(vec3 pos, vec3 nor) {
  // мелкий шум в текстуре
  float r = texture(uTextureGrayNoise, 400.0*pos.xz/W_SCALE ).x;
  // мелкие и крупные пятна на скалах и траве
  float r2 = 0.7 + sqrt(fbm(pos.xz*1.1)*fbm(pos.xz*0.5));
  // полосы на скалах
  vec4 albedo = r2*(r*0.25+0.75)*mix(darkRockAlbedo, lightRockAlbedo,
                 texture(uTextureGrayNoise, vec2(0.1*pos.x/W_SCALE,0.2*pos.y/H_SCALE)).x);

  // песок
  float sh = smoothstep(500.,600.,pos.y); // фактор высоты
  float sn = smoothstep(0.7, 0.9, nor.y); // фактор наклона поверхности
  albedo = mix(albedo, sandAlbedo/*(0.5+0.5*r)*/, sn*sh);

  // земля
  float dh = 1.-smoothstep(500.,650.,pos.y); // фактор высоты
  float dn = smoothstep(0.5, 0.9, nor.y); // фактор наклона поверхности
  albedo = mix(albedo, r2*darkSandAlbedo*(0.5+0.5*r), dn*dh);

  // трава
  float gh = 1.-smoothstep(500.,600.,pos.y); // фактор высоты
  float gn = smoothstep(0.6, 1.0, nor.y); // фактор наклона поверхности
  albedo = mix(albedo, r2*grassAlbedo*(0.25+0.75*r), smoothstep(0.3, 0.6, r2*gh*gn));
  //albedo = mix(albedo, r2*grassAlbedo*(0.25+0.75*r), gh*gn);
  
  // снег на высоте от 800 м 
  float h = smoothstep(800., 1000., pos.y + 250.*fbm(pos.xz/W_SCALE));
  // угол уклона
  float e = smoothstep(1.-0.5*h, 1.-0.1*h, nor.y);
  // северное направление
  float o = 0.3 + 0.7*smoothstep(0., 0.1, -nor.z+h*h);
  float s = h*e*o;
  albedo = mix(albedo, snowAlbedo, smoothstep(0.1, 0.9, s));
  return vec4(albedo.rgb, 1.);
}
