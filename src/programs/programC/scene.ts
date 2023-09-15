import { GRAVITATION } from "src/core/constants";
import { Mat3, Mat4, Quaternion, Vec3 } from "src/shared/libs/vectors";

class MovingObject {
  /** Положение в мировых координатах */
  position: Vec3 = Vec3.ZERO();
  /** Скорость в мировых координатах */
  velocity: Vec3 = Vec3.ZERO();
  /** Угловая скорость вращения */
  angularVelocity: Vec3 = Vec3.ZERO();
  /** Ориентация в виде кватерниона вращения */
  orientation: Quaternion = Quaternion.Identity();
  /** Коэффициенты сопротивления воздуха по осям объекта */
  airDrag: Vec3 = new Vec3(0.01, 0.05, 0.001).mulMutable(58.);
  /** 
   * Вектор задающий граничный контур для отслеживания столкновений
   * контур - бокс с сторонами 2*boundary
   */
  boundary: Vec3 = new Vec3(2,2,2);

  /** Матрица трансформации */
  private _transform: Mat4 = Mat4.ID();
  get transform(): Mat4 { return this._transform; }


  getAcceleration = (time: number, timeDelta: number): Vec3 => { return Vec3.ZERO(); }
  getAngularAcceleration = (time: number, timeDelta: number): Vec3 => { return Vec3.ZERO(); }
  
  update(time: number, timeDelta: number): void {

    const rotMat = Mat3.fromQuat(this.orientation);

    // ускорение тяги
    // ускорение переводим в глобальную систему координат, т.к. ускорение связано с системой координат камеры
    //    v += a*MV
    this.velocity.addMutable(rotMat.mulVecLeft(this.getAcceleration(time, timeDelta)).mulMutable(timeDelta));
    // замедление от сопротивления воздуха
    // коэффициенты сопротивления связаны с ориентацией корабля,
    // поэтому скорость сначала переводим к системе координат камеры,
    // а после домножения на коэфф сопр, возвращаем к глобальной системе
    //    v -= (((MV*v)*AIR_DRAG)*MV)
    this.velocity.subMutable(rotMat.mulVecLeft(rotMat.mulVec(this.velocity).mulElMutable(this.airDrag)).mulMutable(timeDelta));
    // гравитация
    this.velocity.y -= GRAVITATION*timeDelta;

    // перемещение
    this.position.addMutable(this.velocity.mul(timeDelta));

    this._transform = Mat4.modelFromQuatPosition(this.orientation, this.position);

    // вращение
    this.angularVelocity.addMutable(this.getAngularAcceleration(time, timeDelta).mulMutable(Math.PI*3.*timeDelta/180.));
    // замедление вращения
    this.angularVelocity.subMutable(this.angularVelocity.mul(3.*timeDelta));
    // изменение ориентации (поворот кватерниона)
    const rotDelta = this.angularVelocity.mul(-20.*timeDelta);
    this.orientation = Quaternion.fromYawPitchRoll(rotDelta.x, rotDelta.y, rotDelta.z).qmul(this.orientation);
    this.orientation.normalizeMutable();
  }

}

export class Scene {
  objects: MovingObject[] = [];


}