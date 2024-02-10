import { isKeyPress, isKeyDown } from "src/shared/libs/keyboard";
import { Mat3, Quaternion, Vec3 } from "src/shared/libs/vectors";

import { Planet } from "./planet";
import { Atmosphere } from "./Atmosphere/Atmosphere";
import ITerrainSampler from "./Terrain/ITerrainSampler";
import { smoothstep } from "src/shared/libs/mathutils";
import { SUN_DISC_ANGLE_SIN } from "./constants";

export const FRONT_VIEW = 0;
export const MAP_VIEW = 1;

const MAP_GRID = 1;
const MAP_HEIGHTS = 2;

const THRUST = 5; // ускорение двигателя в g
const AIR_DRAG_FACTOR = 0.5 // коэффициент сопротивления воздуха 1/с
const AIR_DRAG_MATRIX = Mat3.fromArray([
  0.01, 0, 0,     // vx       dvx = 0.01*vx
  0, 0.05, 0,     // vy       dvy = 0.05*vy + 0.01*vz (+ подъемная сила)
  0, 0.01, 0.001  // vz       dvz = 0.001*vz
]).mulMutable(AIR_DRAG_FACTOR);
const ATM_HALF_HEIGHT = 7000; // Высота половинной плотности атмосферы
const ANGLE_DELTA = Math.PI/180.
const MIN_ALTITUDE = 2 // минимальная высота над поверхностью

const KEY_SHIFT = 16;
const KEY_CTRL = 17;
const KEY_ALT = 18;
const KEY_SPACE = 32;
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_PLUS = 107;
const KEY_MINUS = 109;
const KEY_EQUAL = 187;
const KEY_MINUS2 = 189;
const KEY_A = 65;
const KEY_D = 68;
const KEY_W = 87;
const KEY_S = 83;
const KEY_M = 77;
const KEY_N = 78;
const KEY_G = 71;
const KEY_H = 72;
const KEY_L = 76;
const KEY_COMMA = 188;
const KEY_PERIOD = 190;


export class Camera {

  private _planet: Planet;

  position: Vec3;
  velocity: Vec3;
  angularSpeed: Vec3;
  // высота камеры над ландшафтом
  altitude: number = 0;
  // высота возвышения ландшафта над уровнем моря
  terrainElevation: number = 0;
  // высота камеры над уровнем моря
  height: number = 0;
  normal: Vec3 = Vec3.K;
  /** Единичный вектор от центра планеты */
  ir: Vec3 = Vec3.K;

  viewAngle: number;
  viewAnglePrev: number;
  orientation: Quaternion;
  /** Максимальная дистанция отрисовки планеты, зависит от расстояния до планеты */
  maxDistance: number = 500000;

  /* Направление камеры */
  direction: Vec3 = new Vec3(0., 0., -1.);
  /** Матрица вращения камеры для передачи вершинному шейдеру. Используется для определения направления лучей */
  transformMat: Mat3 = Mat3.ID;
  /** Матрица вращения камеры предыдущего кадра */
  transformMatPrev: Mat3 = Mat3.ID;
  /** Изменение положения камеры относительно предыдущего кадра */
  positionDelta: Vec3 = Vec3.ZERO;
  /** Яркость фар, 0. - выключены */
  headLights: number = 0;

  tSampler: ITerrainSampler;

  screenMode: number;
  mapMode: number;
  mapScale: number;

  constructor(position: Vec3, quaternion: Quaternion, t: ITerrainSampler, planet: Planet) {
    this._planet = planet;
    this.position = position.copy();
    this.velocity = Vec3.ZERO;
    this.angularSpeed = Vec3.ZERO;
    this.orientation = quaternion;
    this.viewAngle = 80.*Math.PI/180.;
    this.viewAnglePrev = this.viewAngle;
    this.tSampler = t;
    this.screenMode = 0;
    this.mapMode = 0;
    this.mapScale = 5000.;
  }

  /** Функция определения затененности */
  softShadow(ro: Vec3, rd: Vec3): number {
    let res = 1.;
    let t = 0.1;
    let altPrev = this.tSampler.altitude(ro);
    for(let i=0; i<300; i++) { // меньшее кол-во циклов приводит к проблескам в тени
      const p = ro.add(rd.mul(t));
      const alt = this.tSampler.altitude(p);
      if(alt > altPrev && alt >= this.tSampler.MAX_TRN_ELEVATION) return smoothstep(-SUN_DISC_ANGLE_SIN, SUN_DISC_ANGLE_SIN, res);
      altPrev = alt;
      const h = alt - this.tSampler.height(p);
      const rdZenith = rd.dot(this.tSampler.zenith(p))
      const cosA = Math.sqrt(1.-rdZenith*rdZenith); // косинус угла наклона луча от камеры к горизонтали
      res = Math.min(res, cosA*h/t);
      if(res < -SUN_DISC_ANGLE_SIN) return 0;
      t += Math.max(20, 0.8*Math.abs(h)); // коэффициент устраняет полосатость при плавном переходе тени
    }
    return smoothstep(-SUN_DISC_ANGLE_SIN, SUN_DISC_ANGLE_SIN, res);
  }
  
  inShadow(atm: Atmosphere, pos: Vec3, sunDir: Vec3): number {
    const planetShadow = this._planet.softPlanetShadow(pos,sunDir);
    if(planetShadow<=0.001) return 0.;
    const s = planetShadow*this.softShadow(this.position, sunDir);
    return Math.pow(s, 4.);
  }

  loopCalculation(time: number, timeDelta: number): void {

    const acceleration = new Vec3(
      isKeyDown(KEY_D) - isKeyDown(KEY_A),
      0.,
      isKeyDown(KEY_S) - isKeyDown(KEY_W)
    );

    this.maxDistance = this._planet.center.sub(this.position).length() + this._planet.radius;
    this.transformMatPrev = this.transformMat;

    const mdir = Mat3.fromQuat(this.orientation);
    this.transformMat = mdir;

    ////////////////////////////////////////////////////////////////////////////
    // перемещение
    this.positionDelta = this.position.copy();
    this.position.addMutable(this.velocity.mul(timeDelta));

    // не даем провалиться ниже поверхности
    const alt = this.tSampler.altitude(this.position);
    const hNormal = this.tSampler.heightNormal(this.position);
    this.terrainElevation = hNormal.value;
    this.normal = hNormal.diff;
    const rn = this.tSampler.zenith(this.position);
    this.ir = rn;
    
    let altitude = alt - hNormal.value - MIN_ALTITUDE;
    if(altitude < 0) {
      // направление от центра планеты
      const VdotN = this.velocity.dot(rn);
      if(VdotN < 0) this.velocity.subMutable(rn.mul(VdotN));
      this.position.subMutable(rn.mul(altitude));
      altitude = 0;
    }
    // вычисление изменения положения камеры
    this.positionDelta = this.position.sub(this.positionDelta);
    // высота над поверхностью
    this.altitude = altitude + MIN_ALTITUDE
    this.height = this.terrainElevation + this.altitude;

    ////////////////////////////////////////////////////////////////////////////
    // ускорение тяги
    this.velocity.addMutable(mdir.mulVec(acceleration).mulMutable(THRUST*this._planet.g*timeDelta));
    // множитель, учитывающий уменьшение плотности с высотой
    const airDensityFactor = Math.exp(-0.6931*this.height/ATM_HALF_HEIGHT);
    // замедление от сопротивления воздуха
    this.velocity.subMutable(mdir.mulVec(AIR_DRAG_MATRIX.mulVec(mdir.mulVecLeft(this.velocity)).mulMutable(airDensityFactor*this.velocity.length())).mulMutable(timeDelta));
    // гравитация
    this.velocity.subMutable(rn.mul(this._planet.g*timeDelta));
    // экстренная остановка
    if(isKeyDown(KEY_SPACE) > 0) this.velocity = Vec3.ZERO;

    ////////////////////////////////////////////////////////////////////////////
    // вращение
    const angularAcceleration = new Vec3(
      isKeyDown(KEY_DOWN) - isKeyDown(KEY_UP), 
      isKeyDown(KEY_COMMA) - isKeyDown(KEY_PERIOD),
      2.*(isKeyDown(KEY_LEFT) - isKeyDown(KEY_RIGHT))
    );
    // ускорение вращения клавишами
    this.angularSpeed.addMutable(angularAcceleration.mulMutable(ANGLE_DELTA*3.*timeDelta));
    // замедление вращения без клавиш
    this.angularSpeed.subMutable(this.angularSpeed.mul(3.*timeDelta));
    // изменение ориентации (поворот кватерниона)
    const rotDelta = this.angularSpeed.mul(20.*timeDelta);
    this.orientation = this.orientation.qmul(new Quaternion(0,0,Math.sin(rotDelta.z),Math.cos(rotDelta.z)));
    this.orientation = this.orientation.qmul(new Quaternion(Math.sin(rotDelta.x),0,0,Math.cos(rotDelta.x)));
    this.orientation = this.orientation.qmul(new Quaternion(0,Math.sin(rotDelta.y),0,Math.cos(rotDelta.y)));

    this.orientation.normalizeMutable();

    this.direction = this.orientation.rotate(new Vec3(0.,0.,-1.));
  
    this.viewAnglePrev = this.viewAngle;
    // режим экрана
    if(isKeyPress(KEY_M)>0) this.screenMode = this.screenMode==FRONT_VIEW ? MAP_VIEW : FRONT_VIEW;
    if(this.screenMode==MAP_VIEW) {
      this.mapScale *= 1.0 + 0.01*(isKeyDown(KEY_MINUS)+isKeyDown(KEY_MINUS2)-isKeyDown(KEY_PLUS)-isKeyDown(KEY_EQUAL));
      if(isKeyPress(KEY_G)>0) this.mapMode ^= MAP_GRID;
      if(isKeyPress(KEY_H)>0) this.mapMode ^= MAP_HEIGHTS;
    }
    else this.viewAngle += 0.01*(isKeyDown(KEY_MINUS)+isKeyDown(KEY_MINUS2)-isKeyDown(KEY_PLUS)-isKeyDown(KEY_EQUAL));

    if(isKeyPress(KEY_L)>0) this.headLights = this.headLights==0 ? 100. : 0.;

  }
}
