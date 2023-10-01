#define BIOME_MODULE

//uniform sampler2D uTextureGrayNoise;


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
//vec4 grassAlbedo = 5.*vec4(0.042, 0.042, 0.015, 1.); 
vec4 grassAlbedo = vec4(pow(vec3(0.23529411765, 0.21568627451, 0.14313725490), vec3(2.2)), 1.);
vec4 grassAlbedo2 = vec4(pow(vec3(0.2498, 0.2509, 0.1176), vec3(2.2)), 1.);
//vec4 grassAlbedo = vec4(0.27, 0.21, 0.09, 1.);
//vec4 darkRockAlbedo = 5.*vec4(0.072, 0.045, 0.027, 1.);
//vec4 lightRockAlbedo = 5.*vec4(0.09, 0.081, 0.072, 1.);
vec4 lightRockAlbedo = vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
vec4 darkRockAlbedo = vec4(0.8*pow(vec3(0.3843, 0.2901, 0.2784), vec3(2.2)), 1.);
//vec4 sandAlbedo = 5.*1.7*vec4(0.09, 0.081, 0.072, 1.);
vec4 sandAlbedo = vec4(pow(vec3(0.59607843137, 0.50588235294, 0.49803921569), vec3(2.2)), 1.);

vec4 darkSandAlbedo = vec4(0.4*pow(vec3(0.43137254902, 0.34117647059, 0.360784313737), vec3(2.2)), 1.);//5.*vec4(0.030, 0.022, 0.010, 1.);
//vec4 snowAlbedo = 5.*vec4(0.1798, 0.1885, 0.203, 1.);

//vec4 grassAlbedo = vec4(0.158, 0.158, 0.053, 1.);
//vec4 grassAlbedo = vec4(0.27, 0.21, 0.09, 1.);
//vec4 darkRockAlbedo = vec4(0.252, 0.158, 0.095, 1.);
//vec4 lightRockAlbedo = vec4(0.315, 0.284, 0.252, 1.);
//vec4 sandAlbedo = vec4(0.252, 0.158, 0.095, 1.);
//vec4 sandAlbedo = vec4(0.585, 0.482, 0.428, 1.);
//vec4 darkSandAlbedo = vec4(0.150, 0.110, 0.050, 1.);
//vec4 snowAlbedo = vec4(0.750, 0.940, 1.00, 1.);
vec4 snowAlbedo = vec4(0.75, 0.80, 0.85, 1.);

// определение цвета пикселя
// lla - широта, долгота, высота точки
// norz - вертикальная составляющая нормали к поверхности
// uv - текстурные координаты
vec4 biomeColor(vec3 lla, float norz, vec2 uv) {
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  // мелкий шум в текстуре
  float r = texture(uTextureGrayNoise, 400.0*uv/W_SCALE ).x;
  //r = mix(1., 0.5+0.5*r, LvsR);
  // мелкие и крупные пятна на скалах и траве
  float r2 = sqrt(fbm(uv*1.1)*fbm(uv*0.5));
  //r2 = mix(1., r2, LvsR);
  // полосы на скалах
  vec4 albedo =(1.+0.*r2)*(r*0.25+1.)*mix(darkRockAlbedo, lightRockAlbedo,
                 texture(uTextureGrayNoise, vec2(0.1*lla.x/W_SCALE,0.2*lla.z/H_SCALE)).x*r2);

  // песок
  float sh = smoothstep(500.,600.,lla.z); // фактор высоты
  float sn = smoothstep(0.7, 0.9, norz); // фактор наклона поверхности
  albedo = mix(albedo, sandAlbedo*(0.5+0.5*r), sn*sh);

  // земля
  float dh = 1.-smoothstep(500.,650.,lla.z); // фактор высоты
  float dn = smoothstep(0.5, 1., norz); // фактор наклона поверхности
  albedo = mix(albedo, r2*darkSandAlbedo*(0.5+0.5*r), dn*dh);

  // трава
  float gh = 1.-smoothstep(400.,600.,lla.z); // фактор высоты
  float gn = smoothstep(0.6, 1.0, norz); // фактор наклона поверхности
  albedo = mix(albedo, (0.25+0.75*r)*mix(grassAlbedo,grassAlbedo2,r2), step(0.6, gh*gn));
  //albedo = mix(albedo, r2*grassAlbedo*(0.25+0.75*r), gh*gn);
  
  // снег на высоте от 800 м 
  float h = smoothstep(800., 1000., lla.z + 250.*fbm(uv/W_SCALE));
  // угол уклона
  float e = smoothstep(1.-0.5*h, 1.-0.1*h, norz);
  // северное направление
  //float o = 0.3 + 0.7*smoothstep(0., 0.1, -nor.z + h*h);
  float s = h*e;//*o;
  albedo = mix(albedo, snowAlbedo, smoothstep(0.1, 0.9, s));
  //return vec4(vec3(norz), 1.);
  return vec4(albedo.rgb, 1.);
}

