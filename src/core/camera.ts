import { Atmosphere } from "./atmosphere";
import { isKeyPress, isKeyDown } from "./keyboard";
import { Quaternion } from "./quaternion";
import { TerrainSampler } from "./terrain";
import { Mat3, Vec2, Vec3 } from "./vectors";

const FRONT_VIEW = 0;
const MAP_VIEW = 1;

const MAP_GRID = 1;
const MAP_HEIGHTS = 2;

const GRAVITATION = 0.; //9.8; // ускорение свободного падения м/с2
const THRUST = 11.; // ускорение двигателя м/с2
const AIR_DRAG_FACTOR = 58.; // коэффициент сопротивления воздуха 1/с
const AIR_DRAG = new Vec3(0.01, 0.05, 0.001).mulMutable(AIR_DRAG_FACTOR); // вектор сопротивления по осям
const ANGLE_DELTA = Math.PI/180.;

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
  position: Vec3;
  velocity: Vec3;
  angularSpeed: Vec3;
  altitude: number;
  viewAngle: number;
  orientation: Quaternion;
  /* Направление камеры */
  direction: Vec3 = new Vec3(0.,0.,-1.);
  /** Матрица вращения камеры для передачи вершинному шейдеру. Используется для определения направления лучей */
  transformMat: Mat3;
  /** Яркость фар, 0. - выключены */
  headLights: number = 0;

  tSampler: TerrainSampler;

  screenMode: number;
  mapMode: number;
  mapScale: number;

  constructor(position: Vec3, quaternion: Quaternion, t: TerrainSampler) {
    this.position = position.copy();
    this.velocity = Vec3.ZERO();
    this.angularSpeed = Vec3.ZERO();
    this.orientation = quaternion;
    this.viewAngle = 80.*Math.PI/180.;
    this.tSampler = t;
    this.screenMode = 0;
    this.mapMode = 0;
    this.mapScale = 1.;
  }

  inShadow(atm: Atmosphere, pos: Vec3, sunDir: Vec3): number {
    const planetShadow = atm.softPlanetShadow(pos,sunDir);
    if(planetShadow<=0.001) return 0.;
    const s = planetShadow*this.tSampler.softShadow(this.position, sunDir);
    return Math.pow(s, 4.);
  }

  loopCalculation(time: number, timeDelta: number): void {

    const acceleration = new Vec3(
      0.,
      0.,
      isKeyDown(KEY_S) - isKeyDown(KEY_W)
    );

    const mdir = this.orientation.mat3();
    this.transformMat = mdir;

    // ускорение тяги
    this.velocity.addMutable(mdir.mul(acceleration).mulMutable(THRUST*timeDelta));
    // замедление от сопротивления воздуха
    this.velocity.subMutable( mdir.mul(mdir.mulLeft(this.velocity).mulElMutable(AIR_DRAG)).mulMutable(timeDelta) );
    // гравитация
    this.velocity.y -= GRAVITATION*timeDelta;
    // экстренная остановка
    if(isKeyDown(KEY_SPACE) > 0) this.velocity = Vec3.ZERO();

    // перемещение
    this.position.addMutable(this.velocity.mul(timeDelta));

    // не даем провалиться ниже поверхности
    const height = this.tSampler.terrainM(new Vec2(this.position.x, this.position.z)) + 2.;
    if(this.position.y < height) {
      this.velocity.y = 0.;
      this.position.y = height;
    }
    // высота над поверхностью
    this.altitude = this.position.y - height;

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
    const rotDelta = this.angularSpeed.mul(0.5);
    this.orientation = this.orientation.qmul(new Quaternion(0,0,Math.sin(rotDelta.z),Math.cos(rotDelta.z)));
    this.orientation = this.orientation.qmul(new Quaternion(Math.sin(rotDelta.x),0,0,Math.cos(rotDelta.x)));
    this.orientation = this.orientation.qmul(new Quaternion(0,Math.sin(rotDelta.y),0,Math.cos(rotDelta.y)));

    this.orientation.normalizeMutable();

    this.direction = this.orientation.rotate(new Vec3(0.,0.,-1.));
    // режим экрана
    if(isKeyPress(KEY_M)>0) this.screenMode = this.screenMode==FRONT_VIEW ? MAP_VIEW : FRONT_VIEW;
    if(this.screenMode==MAP_VIEW) {
      this.mapScale *= 1.0 + 0.01*(isKeyDown(KEY_MINUS)+isKeyDown(KEY_MINUS2)-isKeyDown(KEY_PLUS)-isKeyDown(KEY_EQUAL));
      if(isKeyPress(KEY_G)>0) this.mapMode ^= MAP_GRID;
      if(isKeyPress(KEY_H)>0) this.mapMode ^= MAP_HEIGHTS;
    }
    else this.viewAngle += 0.01*(isKeyDown(KEY_MINUS)-isKeyDown(KEY_PLUS));

    if(isKeyPress(KEY_L)>0) this.headLights = this.headLights==0 ? 100. : 0.;

  }
}
