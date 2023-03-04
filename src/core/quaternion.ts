import { Mat3, Vec3, Vec4 } from "./vectors";

export class Quaternion extends Vec4 {

  /** Иммутабельный обратный кватернион */
  invert(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w).divMutable(this.dot(this)) as Quaternion;
  }

  /** Иммутабельное произведение двух кватернионов */
  qmul(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w*q.x + this.x*q.w + this.y*q.z - this.z*q.y,
      this.w*q.y + this.y*q.w + this.z*q.x - this.x*q.z,
      this.w*q.z + this.z*q.w + this.x*q.y - this.y*q.x,
      this.w*q.w - this.x*q.x - this.y*q.y - this.z*q.z
    );
  }

  /** Вращение 3-мерного вектора в соответствии с ориентацией кватерниона */
  rotate(v: Vec3): Vec3 {
    const q = new Quaternion(v.x, v.y, v.z, 0.);
    const r = this.qmul(q).qmul(this.invert());
    return new Vec3(r.x, r.y, r.z);
  }

  /** Получение 3-мерной матрицы вращения, соответствующей ориентации кватерниона */
  mat3() {
    return new Mat3(
      this.rotate(Vec3.I()),
      this.rotate(Vec3.J()),
      this.rotate(Vec3.K())
    );
  }

  /** Кватернион, соответствующий повороту вокруг оси axis на угол angle */
  static byAngle(axis: Vec3, angle: number): Quaternion {
    const a = 0.5*angle;
    const p = axis.mul(Math.sin(a));
    return new Quaternion(p.x, p.y, p.z, Math.cos(a));
  }

  /** Кватернион, соответствующий повороту по трем осям на углы: Yaw, Pitch, Roll 
   *  Roll - поворот вокруг продольной оси z (ось крена)
   *  Pitch - поворот вокруг поперечной оси x (ось тангажа)
   *  Yaw - поворот вокруг вертикальной оси y (ось рысканья)
  */
  static byYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion {
    return  Quaternion.byAngle(Vec3.I(), pitch)
            .qmul(Quaternion.byAngle(Vec3.J(), yaw).qmul(Quaternion.byAngle(Vec3.K(), roll)))
  }
}
/*
vec4 qInvert(vec4 q)
{ return vec4(-q.xyz, q.w)/dot(q, q); }

vec4 qMul(vec4 a, vec4 b) { 
  return vec4(
    a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    a.w*b.y + a.y*b.w + a.z*b.x - a.x*b.z,
    a.w*b.z + a.z*b.w + a.x*b.y - a.y*b.x,
    a.w*b.w - dot(a.xyz, b.xyz)
  ); 
}

vec3 qRotate(vec4 q, vec3 p)
{ return qMul(qMul(q, vec4(p, 0.)), qInvert(q)).xyz; }

mat3 qMat3(vec4 q)
{ return mat3(qRotate(q, vec3(1,0,0)), qRotate(q, vec3(0,1,0)), qRotate(q, vec3(0,0,1))); }

vec4 qAngle(vec3 axis, float angle)
{ return vec4(normalize(axis)*sin(angle/2.), cos(angle/2.)); }

vec4 qYyawPitchRoll(float yaw, float pitch, float roll)
{ return qMul(qAngle(vec3(1,0,0), pitch), qMul(qAngle(vec3(0,1,0),yaw), qAngle(vec3(0,0,1),roll))); }

*/
