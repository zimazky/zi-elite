import { Mat3, Vec3, VEC3_I, VEC3_J, VEC3_K, Vec4 } from "./vectors";

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
      this.rotate(VEC3_I),
      this.rotate(VEC3_J),
      this.rotate(VEC3_K)
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
    return  Quaternion.byAngle(VEC3_I, pitch)
            .qmul(Quaternion.byAngle(VEC3_J, yaw).qmul(Quaternion.byAngle(VEC3_K, roll)))
  }
}


