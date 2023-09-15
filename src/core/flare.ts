import { Vec2, Vec3 } from "./vectors";
import { isKeyPress, isKeyDown } from "./keyboard";
import { Camera } from "./camera";
import { rad } from "./mathutils";
import { Planet } from "./planet";

const KEY_F = 70;

/** 
 * Класс для управления световой ракетой
 * Используем один и тот же объект для повторного запуска ракеты
 */
export class Flare {
  private _planet: Planet;

  /** Положение ракеты */
  position: Vec3;
  /** Скорость ракеты */
  velocity: Vec3 = Vec3.ZERO();
  /** Начальная скорость при запуске, м/с */
  initialSpeed = 100;
  /** Направление начального импульса */
  initialDirection: Vec3 = new Vec3(0., Math.sin(rad(15)), -Math.cos(rad(15)));
  /** Видимость ракеты */
  isVisible: boolean = false;
  /** Интенсивность свечения ракеты */
  light: Vec3;
  /** Ускорение свободного падения */
  g: number = 9.81;
  /** Ссылка на экземпляр камеры, для отслеживания положения */
  readonly camera: Camera;
  /** Число столкновений с поверхностью */
  n: number = 0;

  constructor(cam: Camera, planet: Planet, light: Vec3 = new Vec3(100,100,100)) {
    this.camera = cam;
    this._planet = planet;
    this.position = this.camera.position.copy();
    this.light = light
  }

  update(time: number, timeDelta: number) {
    if(this.isVisible) {
      this.position.addMutable(this.velocity.mul(timeDelta));
      this.velocity.addMutable(new Vec3(0., -this.g*timeDelta, 0.));
      // если упала на поверхность, то погасла
      const lla = this._planet.lonLatAlt(this.position);
      const height = this.camera.tSampler.terrainOnSphere(new Vec2(lla.x, lla.y));
      const dy = lla.z - height;
      if(dy < 0) {
        if(++this.n > 0) {
          this.isVisible = false;
          return;
        }
        this.position.y -= dy;
        const norm = this.camera.tSampler.calcNormal(this.position, 200);
        this.velocity.addMutable(norm.mul(-1.1*norm.dot(this.velocity))).mulMutable(0.6);
      }
      return;
    }
    if(isKeyPress(KEY_F)>0) {
      // запуск ракеты, если предыдущая уже погасла
      this.isVisible = true;
      this.n = 0;
      this.position = this.camera.position.add(this.camera.orientation.rotate(Vec3.I()));
      this.velocity = this.camera.velocity.add(this.camera.orientation.rotate(this.initialDirection).mul(this.initialSpeed));
    }
  }

}