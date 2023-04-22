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

// pos - положение камеры
// camdir - направление камеры
vec3 showMap(vec3 pos, vec2 camdir, vec2 uv, int mode, out vec4 norDepth) {
  vec2 p = pos.xz + vec2(1,-1)*uMapScale*uv;
  float h = terrainM(p);
  vec3 nor = calcNormalM(vec3(p.x,h,p.y), 100.);
  norDepth = vec4(nor, MAX_TRN_ELEVATION-h);
  vec4 albedo = terrain_color(vec3(p.x,h,p.y), nor);
  vec3 col = albedo.rgb;//vec3(0.5+0.5*dot(nor.xyz,normalize(vec3(-1,1,-1))))*albedo.rgb;
  // положение камеры
  col *= smoothstep(.01,0.012,length(pos.xz-p)/uMapScale);
  // направление камеры
  vec2 rp = pos.xz-p;
  col *= dot(rp,camdir)<0. ? smoothstep(0.0,0.002,abs(camdir.x*rp.y-camdir.y*rp.x)/uMapScale) : 1.;
  if((mode & MAP_GRID)!=0) {
    // координатная сетка, по 500м на линию
    vec2 gr = smoothstep(0.,0.06, grid(p,500.));
    col *= gr.x*gr.y;
  }
  // уровни высот, по 50м на уровень
  col *= (mode & MAP_HEIGHTS)!=0 ? smoothstep(0.,1., grid(h,50.)) : 1.;
  return col;
}
