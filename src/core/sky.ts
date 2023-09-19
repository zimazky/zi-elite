import { Mat3, Quaternion, Vec3 } from "src/shared/libs/vectors";
import { isKeyPress } from "src/shared/libs/keyboard";

import { Camera } from "./camera";
import { Atmosphere } from "./atmosphere";
import { SUN_COLOR } from "./constants";
import ITerrainSampler from "./Terrain/ITerrainSampler";

const KEY_C = 67;

const skyAngle = Math.PI*0.12; // угол наклона оси вращения небесной сферы относительно зенита

export class Sky {
  /** поворот небесного свода (плоскости млечного пути) относительно системы координат планеты (на момент t=0) */
  quat: Quaternion = Quaternion.fromAxisAngle(Vec3.I, 0.5*Math.PI);
  /** ось вращения небесной сферы */
  axis: Vec3 = new Vec3(0., Math.cos(skyAngle), -Math.sin(skyAngle));
  /** период полного поворота небесной сферы в секундах */
  period = 1200.;
  /** вектор направления на солнце (на момент t=0) */
  sunDir = new Vec3(0., -Math.sin(skyAngle), -Math.cos(skyAngle));
  /** вектор направления на луну (на момент t=0) */
  moonDir = new Vec3(0., Math.sin(skyAngle), Math.cos(skyAngle));
  /** поворот небесного свода за счет суточного вращения */
  orientation: Quaternion = Quaternion.ID;
  /** матрица поворота для передачи вершинному шейдеру */
  transformMat: Mat3 = Mat3.ID;
  /** флаг отображения созвездий */
  isShowConstellations: boolean = false;
  /** направление на солнце на данный момент */
  sunDirection: Vec3 = this.sunDir.copy();
  /** направление на луну на данный момент */
  moonDirection: Vec3 = this.moonDir.copy();

  camera: Camera;
  atm: Atmosphere;
  tSampler: ITerrainSampler;

  skyRefreshTime: number = 0.;

  sunDiscColor: Vec3 = Vec3.ZERO;
  moonDiskColor: Vec3 = new Vec3(0.005,0.005,0.01);
  skyColor: Vec3 = Vec3.ZERO;

  constructor(camera: Camera, atm: Atmosphere, tSampler: ITerrainSampler) {
    this.camera = camera;
    this.atm = atm;
    this.tSampler = tSampler;
  }

  loopCalculation(time: number, timeDelta: number) {
    this.orientation = Quaternion.fromAxisAngle(this.axis, -2.*Math.PI*(0.185+time/this.period));
    this.transformMat = Mat3.fromQuat(this.orientation.qmul(this.quat));
    this.sunDirection = this.orientation.rotate(this.sunDir).normalize();
    this.moonDirection = this.orientation.rotate(this.moonDir).normalize();

    // отображение созвездий
    if(isKeyPress(KEY_C)>0) this.isShowConstellations = !this.isShowConstellations;

    if(time>this.skyRefreshTime) {
      // Определение цвета неба и цвета диска солнца
      const zenith = this.tSampler.zenith(this.camera.position);
      const pos = this.atm.planetCenter.add(zenith.mul(this.atm.planetRadius+100)); // положение для которого рассчитываем цвета
      const sunDir = this.sunDirection.copy();
      const sunDirZ = sunDir.dot(zenith);
      if(sunDirZ < 0.) sunDir.subMutable(zenith.mul(sunDirZ));
      sunDir.normalizeMutable();
      const sunDirScatter = this.atm.scattering(pos, sunDir, sunDir);
      const sunIntensity = SUN_COLOR.mul(20.);
      this.sunDiscColor = sunIntensity.mulEl(sunDirScatter.t).safeNormalize().mulMutable(2.);

      const oneDivSqrt2 = 1./Math.sqrt(2.);
      // светимость неба по 5-ти точкам
      let tangent: Vec3;
      let binormal: Vec3;
      const c1 = zenith.cross(Vec3.K);
      const c2 = zenith.cross(Vec3.I);
      if(c1.length() > c2.length()) tangent = c1;
      else tangent = c2;
      tangent.normalizeMutable();
      binormal = zenith.cross(tangent).normalizeMutable();

      const skyDirScatter = 
        this.atm.scattering(pos, zenith, this.sunDirection).t
        .add(this.atm.scattering(pos, zenith.add(tangent).normalizeMutable(), this.sunDirection).t)
        .add(this.atm.scattering(pos, zenith.sub(tangent).normalizeMutable(), this.sunDirection).t)
        .add(this.atm.scattering(pos, zenith.add(binormal).normalizeMutable(), this.sunDirection).t)
        .add(this.atm.scattering(pos, zenith.sub(binormal).normalizeMutable(), this.sunDirection).t)
        .div(5.);
      this.skyColor = sunIntensity.mulEl(skyDirScatter);//.mulMutable(2);//.mulMutable(2.*Math.PI);//.addMutable(new Vec3(0.001,0.001,0.001));

      this.skyRefreshTime = time + 0.05;
    }

  }

}