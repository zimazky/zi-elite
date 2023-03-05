import { keyBuffer } from "./keyboard";
import { Quaternion } from "./quaternion";
import { TerrainSampler } from "./terrain";
import { Vec2, Vec3 } from "./vectors";


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
const KEY_COMMA = 188;
const KEY_PERIOD = 190;


export class Camera {
  position: Vec3;
  velocity: Vec3;
  angularSpeed: Vec3;
  altitude: number;
  viewAngle: number;
  orientation: Quaternion;
  tSampler: TerrainSampler;

  constructor(position: Vec3, t: TerrainSampler) {
    this.position = position.copy();
    this.velocity = Vec3.ZERO();
    this.angularSpeed = Vec3.ZERO();
    this.orientation = new Quaternion(0.,0.,0.,1.);
    this.viewAngle = 80.*Math.PI/180.;
    this.tSampler = t;
  }

  inShadow(sunDir: Vec3): number {
    return this.tSampler.softShadow(this.position, sunDir);
  }

  loopCalculation(time: number, timeDelta: number): void {

    const acceleration = new Vec3(
      0.,
      0.,
      keyBuffer[KEY_S] - keyBuffer[KEY_W] 
    );

    const mdir = this.orientation.mat3();

    // ускорение тяги
    this.velocity.addMutable(mdir.mul(acceleration).mulMutable(THRUST*timeDelta));
    // замедление от сопротивления воздуха
    this.velocity.subMutable( mdir.mul(mdir.mulLeft(this.velocity).mulElMutable(AIR_DRAG)).mulMutable(timeDelta) );
    // гравитация
    this.velocity.y -= GRAVITATION*timeDelta;
    // экстренная остановка
    if(keyBuffer[KEY_SPACE] > 0) this.velocity = Vec3.ZERO();

    // перемещение
    this.position.addMutable(this.velocity.mul(timeDelta));

    // не даем провалиться ниже поверхности
    const height = this.tSampler.terrainM(new Vec2(this.position.x, this.position.z)) + 2.;
    if(this.position.y < height) {
      this.velocity.y = 0.;
      this.position.y = height;
    }
    
    //console.log(height, this.position.y);

    //this.position.y = 2200.;

    // высота над поверхностью
    this.altitude = this.position.y - height;

    // вращение
    const angularAcceleration = new Vec3(
      keyBuffer[KEY_DOWN] - keyBuffer[KEY_UP], 
      keyBuffer[KEY_COMMA] - keyBuffer[KEY_PERIOD],
      2.*(keyBuffer[KEY_LEFT] - keyBuffer[KEY_RIGHT])
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

    //console.log(this.orientation);
    //console.log(keyBuffer);
    //console.log(rotDelta);
    //console.log(this.angularSpeed);

  }
}
