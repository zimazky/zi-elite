import { Quaternion } from "./quaternion";
import { Mat3, Vec3 } from "./vectors";
import { isKeyPress, isKeyDown } from "./keyboard";

const KEY_C = 67;

const skyAngle = Math.PI*0.12; // угол наклона оси вращения небесной сферы относительно зенита

export class Sky {
  /** поворот небесного свода (плоскости млечного пути) относительно системы координат планеты (на момент t=0) */
  quat: Quaternion = Quaternion.byAngle(Vec3.I(), 0.5*Math.PI);
  /** ось вращения небесной сферы */
  axis: Vec3 = new Vec3(0., Math.cos(skyAngle), -Math.sin(skyAngle));
  /** период полного поворота небесной сферы в секундах */
  period = 1200.;
  /** вектор направления на солнце (на момент t=0) */
  sunDir = new Vec3(0., -Math.sin(skyAngle), -Math.cos(skyAngle));
  /** поворот небесного свода за счет суточного вращения */
  orientation: Quaternion = Quaternion.Identity();
  /** матрица поворота для передачи вершинному шейдеру */
  transformMat: Mat3 = Mat3.ID();
  /** флаг отображения созвездий */
  isShowConstellations: boolean = false;
  /** направление на солнце на данный момент */
  sunDirection: Vec3 = this.sunDir.copy();

  loopCalculation(time: number, timeDelta: number) {
    this.orientation = Quaternion.byAngle(this.axis, -2.*Math.PI*(0.15+time/this.period));
    this.transformMat = this.orientation.qmul(this.quat).mat3();
    this.sunDirection = this.orientation.rotate(this.sunDir).normalize();

    // отображение созвездий
    if(isKeyPress(KEY_C)>0) this.isShowConstellations = !this.isShowConstellations;
  }

}