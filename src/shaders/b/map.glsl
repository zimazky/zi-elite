#define MAP_MODULE

// ----------------------------------------------------------------------------
// Модуль определения функций отображения карты
// ----------------------------------------------------------------------------

float grid(float x, float st) {
  float s = 2.*x/st;
  float a = fract(s);
  s = floor(mod(s,2.));
  return pow(mix(a,1.-a,s),.2);
}

vec2 grid(vec2 x, float st) {
  vec2 s = 2.*x/st;
  vec2 a = fract(s);
  s = floor(mod(s,2.));
  return mix(a,1.-a,s);
}

/*
// lla - сферические координаты камеры
// camdir - направление камеры
vec3 showMap(vec3 lla, vec2 camdir, vec2 uv, int mode, out vec4 norDepth) {
  float mapScale = uMapScale*PI/360.;
  vec2 p = lla.xy + vec2(1,-1)*mapScale*uv;
  float h = terrainOnSphere(p);
  vec3 nor = calcNormalOnSphere(lla, 500.);
  norDepth = vec4(nor, MAX_TRN_ELEVATION-h);
  vec4 albedo = terrain_color(vec3(p.x,h,p.y), nor);
  vec3 col = albedo.rgb;//vec3(0.5+0.5*dot(nor.xyz,normalize(vec3(-1,1,-1))))*albedo.rgb;
  // положение камеры
  col *= smoothstep(.01,0.012,length(lla.xy-p)/mapScale);
  // направление камеры
  vec2 rp = lla.xy-p;
  col *= dot(rp,camdir)<0. ? smoothstep(0.0,0.002,abs(camdir.x*rp.y-camdir.y*rp.x)/mapScale) : 1.;
  if((mode & MAP_GRID)!=0) {
    // координатная сетка, по 500м на линию
    vec2 gr = smoothstep(0.,0.06, grid(p,500.));
    col *= gr.x*gr.y;
  }
  // уровни высот, по 50м на уровень
  col *= (mode & MAP_HEIGHTS)!=0 ? smoothstep(0.,1., grid(h,50.)) : 1.;
  return col;
}
*/