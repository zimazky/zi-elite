import { Mat3, Quaternion, Vec3 } from "src/shared/libs/vectors";
import { isKeyPress } from "src/shared/libs/keyboard";

import { Camera } from "./camera";
import { Atmosphere } from "./Atmosphere/Atmosphere";
import { SUN_COLOR } from "./constants";
import ITerrainSampler from "./Terrain/ITerrainSampler";

const KEY_C = 67;

const skyAngle = 0.25*Math.PI;//*0.12; // угол наклона оси вращения небесной сферы относительно зенита

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

  sunDiscColor: Vec3 = Vec3.ONE;
  moonDiskColor: Vec3 = new Vec3(0.002,0.002,0.002);

  /** Таблица цвета неба в зависимости от косинуса угла наклона солнца
   * индекс 0 соответствует косинусу -1
   * индекс N-1 - соответствует 1
   */
  skyColorTable: Float32Array;
  sunColorTable: Float32Array;

  constructor(camera: Camera, atm: Atmosphere, tSampler: ITerrainSampler) {
    this.camera = camera;
    this.atm = atm;
    this.tSampler = tSampler;
    const N = 2*1024;
    this.skyColorTable = new Float32Array(N*3);
    this.sunColorTable = new Float32Array(N*3);
    for(let i=0, j=0; j<N; j++, i+=3) {
      const cosTheta = -1. + j*2./(N-1);
      const {sun, sky} = this.getSunAndSkyColor(cosTheta);
      this.skyColorTable[i] = sky.x;
      this.skyColorTable[i+1] = sky.y;
      this.skyColorTable[i+2] = sky.z;
      this.sunColorTable[i] = sun.x;
      this.sunColorTable[i+1] = sun.y;
      this.sunColorTable[i+2] = sun.z;
    }

  }

  loopCalculation(time: number, timeDelta: number) {
    this.orientation = Quaternion.fromAxisAngle(this.axis, -2.*Math.PI*(0.715+time/this.period));
    this.transformMat = Mat3.fromQuat(this.orientation.qmul(this.quat));
    this.sunDirection = this.orientation.rotate(this.sunDir).normalize();
    this.moonDirection = this.orientation.rotate(this.moonDir).normalize();

    // отображение созвездий
    if(isKeyPress(KEY_C)>0) this.isShowConstellations = !this.isShowConstellations;

    if(time>this.skyRefreshTime) {
      // Определение цвета неба и цвета диска солнца
      const sunDirScatter = this.atm.scattering(this.camera.position, this.sunDirection, this.sunDirection);
      this.sunDiscColor = sunDirScatter.t.mulEl(SUN_COLOR).addMutable(sunDirScatter.i.mulEl(SUN_COLOR)).safeNormalize().mulMutable(2.);

      this.skyRefreshTime = time + 0.05;
    }

  }

  /**
   * Определение цвета для солнца и неба на поверхности в зависимости от склонения солнца
   * Считаем без учета рассеивания Ми
   * @param cosTheta - косинус угла направления на солнце к зениту
   */
  getSunAndSkyColor(cosTheta: number): {sun: Vec3, sky: Vec3} {
    const zenith = Vec3.J; // зенит в направлении оси Y
    const pos = new Vec3(0,100,0); // положение для которого рассчитываем цвета
    const sunDir = new Vec3(Math.sqrt(1-cosTheta*cosTheta), cosTheta, 0);

    const oneDivSqrt2 = 1./Math.sqrt(2.);
    // светимость неба по 5-ти точкам
    const tangent = new Vec3(0, oneDivSqrt2, oneDivSqrt2);
    const binormal1 = new Vec3(oneDivSqrt2, oneDivSqrt2, 0);
    const binormal2 = new Vec3(-oneDivSqrt2, oneDivSqrt2, 0);

    const skyDirScatter = 
      this.atm.scatteringRayleigh(pos, zenith, sunDir).t
      .add(this.atm.scatteringRayleigh(pos, tangent, sunDir).t.mul(2))
      .add(this.atm.scatteringRayleigh(pos, binormal1, sunDir).t)
      .add(this.atm.scatteringRayleigh(pos, binormal2, sunDir).t)
      .div(5.);
    const sunIntensity = SUN_COLOR.mul(15.);
    const sky = sunIntensity.mulEl(skyDirScatter);

    if(cosTheta < 0.) { sunDir.x = 1; sunDir.y = 0; }
    const sunDirScatter = this.atm.scattering(pos, sunDir, sunDir);
    const sun = sunDirScatter.t.mulEl(SUN_COLOR).addMutable(sunDirScatter.i.mulEl(SUN_COLOR)).safeNormalize().mulMutable(2.);

    return {sun, sky};
  }

}