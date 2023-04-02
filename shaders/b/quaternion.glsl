#define QUAT_MODULE

// ----------------------------------------------------------------------------
// Операции с кватернионами
// ----------------------------------------------------------------------------
vec4 qInvert(vec4 q) { return vec4(-q.xyz, q.w)/dot(q, q); }

vec4 qMul(vec4 a, vec4 b) { 
  return vec4(
    a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    a.w*b.y + a.y*b.w + a.z*b.x - a.x*b.z,
    a.w*b.z + a.z*b.w + a.x*b.y - a.y*b.x,
    a.w*b.w - dot(a.xyz, b.xyz)
  ); 
}

vec3 qRotate(vec4 q, vec3 p) { return qMul(qMul(q, vec4(p, 0.)), qInvert(q)).xyz; }

mat3 qMat3(vec4 q) { return mat3(qRotate(q, vec3(1,0,0)), qRotate(q, vec3(0,1,0)), qRotate(q, vec3(0,0,1))); }

vec4 qAngle(vec3 axis, float angle) { return vec4(normalize(axis)*sin(angle/2.), cos(angle/2.)); }

vec4 qYyawPitchRoll(float yaw, float pitch, float roll) { 
  return qMul(qAngle(vec3(1,0,0), pitch), qMul(qAngle(vec3(0,1,0),yaw), qAngle(vec3(0,0,1),roll)));
}
