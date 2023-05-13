import { Quaternion } from "./quaternion";
import { Mat3, Vec3 } from "./vectors";
import { isKeyPress, isKeyDown } from "./keyboard";
import { Camera } from "./camera";
import { Atmosphere } from "./atmosphere";
import { SUN_COLOR } from "./constants";

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
  /** вектор направления на луну (на момент t=0) */
  moonDir = new Vec3(0., Math.sin(skyAngle), Math.cos(skyAngle));
  /** поворот небесного свода за счет суточного вращения */
  orientation: Quaternion = Quaternion.Identity();
  /** матрица поворота для передачи вершинному шейдеру */
  transformMat: Mat3 = Mat3.ID();
  /** флаг отображения созвездий */
  isShowConstellations: boolean = false;
  /** направление на солнце на данный момент */
  sunDirection: Vec3 = this.sunDir.copy();
  /** направление на луну на данный момент */
  moonDirection: Vec3 = this.moonDir.copy();

  camera: Camera;
  atm: Atmosphere;

  skyRefreshTime: number = 0.;

  sunDiscColor: Vec3 = Vec3.ZERO();
  moonDiskColor: Vec3 = new Vec3(0.005,0.005,0.01);
  skyColor: Vec3 = Vec3.ZERO();

  constructor(camera: Camera, atm: Atmosphere) {
    this.camera = camera;
    this.atm = atm;
  }

  loopCalculation(time: number, timeDelta: number) {
    this.orientation = Quaternion.byAngle(this.axis, -2.*Math.PI*(0.205+time/this.period));
    this.transformMat = this.orientation.qmul(this.quat).mat3();
    this.sunDirection = this.orientation.rotate(this.sunDir).normalize();
    this.moonDirection = this.orientation.rotate(this.moonDir).normalize();

    // отображение созвездий
    if(isKeyPress(KEY_C)>0) this.isShowConstellations = !this.isShowConstellations;

    if(time>this.skyRefreshTime) {
      // Определение цвета неба и цвета диска солнца
      const pos = new Vec3(this.camera.position.x, 0., this.camera.position.z); // положение для которого рассчитываем цвета
      const sunDir = this.sunDirection.copy();
      if(sunDir.y<0.) sunDir.y = 0.;
      sunDir.normalizeMutable();
      const sunDirScatter = this.atm.scattering(pos, sunDir, sunDir);
      const sunIntensity = SUN_COLOR.mul(20.);
      this.sunDiscColor = sunIntensity.mulEl(sunDirScatter.t).safeNormalize().mulMutable(2.);

      const oneDivSqrt2 = 1./Math.sqrt(2.);
      // светимость неба по 5-ти точкам
      const skyDirScatter = 
        this.atm.scattering(pos, Vec3.J(), this.sunDirection).t
        .add(this.atm.scattering(pos, new Vec3(oneDivSqrt2, oneDivSqrt2, 0), this.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(-oneDivSqrt2, oneDivSqrt2, 0), this.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(0, oneDivSqrt2, oneDivSqrt2), this.sunDirection).t)
        .add(this.atm.scattering(pos, new Vec3(0, oneDivSqrt2, -oneDivSqrt2), this.sunDirection).t)
        .div(5.);
      this.skyColor = sunIntensity.mulEl(skyDirScatter);//.mulMutable(2);//.mulMutable(2.*Math.PI);//.addMutable(new Vec3(0.001,0.001,0.001));

      this.skyRefreshTime = time + 0.05;
    }

  }

}